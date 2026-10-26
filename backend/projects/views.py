from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from backend.serializers import PublicUserSerializer
from backend.views import user_by_handle

from .models import CoauthorInvite, Comment, Project
from .serializers import CommentSerializer, ProjectSerializer

PUBLIC_ACTIONS = {"list", "retrieve", "user_projects"}
WRITABLE_FIELDS = [
    "projectTitle", "authors", "description", "tags", "githubRepos", "liveProject",
    "featured", "order", "role", "period_start", "period_end", "body", "lang", "links", "translations",
]


def project_queryset():
    return (
        Project.objects.select_related("user__profile")
        .prefetch_related(
            "users__profile", "likes", "links", "images", "invites", "translations",
            Prefetch("comments", queryset=Comment.objects.select_related("user__profile").order_by("created_at")),
        )
        .order_by("order", "-id")
    )


def _parse_authors(owner, authors):
    """Comma-separated GitHub usernames → (normalised string, existing users, unknown usernames).

    The owner always comes first. Unknown usernames become co-author invites
    instead of placeholder accounts.
    """
    usernames = []
    for name in (authors or "").split(","):
        name = name.strip().lstrip("@").lower()
        if name and name not in usernames:
            usernames.append(name)
    if owner.username not in usernames:
        usernames.insert(0, owner.username)
    existing = {u.username: u for u in User.objects.filter(username__in=usernames)}
    users = [existing[name] for name in usernames if name in existing]
    unknown = [name for name in usernames if name not in existing]
    return ", ".join(usernames), users, unknown


def _apply_authors(project, users, unknown):
    project.users.set(users)
    project.invites.filter(status=CoauthorInvite.PENDING).exclude(github_username__in=unknown).delete()
    for name in unknown:
        CoauthorInvite.objects.get_or_create(project=project, github_username=name)


NULLABLE_DATES = ("period_start", "period_end")


def _project_data(request):
    """Plain dict of the writable fields, plus the uploaded image if there is one."""
    data = {field: request.data[field] for field in WRITABLE_FIELDS if field in request.data}
    # A form sends an empty date as "", which means "no date" (e.g. an ongoing project).
    for field in NULLABLE_DATES:
        if data.get(field) == "":
            data[field] = None
    if "imgFile" in request.FILES:
        data["imgFile"] = request.FILES["imgFile"]
    return data


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return project_queryset()

    def get_permissions(self):
        if self.action in PUBLIC_ACTIONS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def _forbid_unless_owner(self, project, verb):
        if project.user_id != self.request.user.id:
            return Response(
                {"detail": f"You do not have permission to {verb} this project."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def _fresh(self, project):
        return self.get_serializer(project_queryset().get(pk=project.pk)).data

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = _project_data(request)
        data["authors"], users, unknown = _parse_authors(request.user, data.get("authors"))
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        links = serializer.validated_data.pop("links", None)
        translations = serializer.validated_data.pop("translations", None)
        project = serializer.save(user=request.user)
        _apply_authors(project, users, unknown)
        serializer.save_related(project, links=links, translations=translations)
        return Response(self._fresh(project), status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def create_with_token(self, request, *args, **kwargs):
        """Kept for the current frontend; same as POST /api/projects/."""
        return self.create(request, *args, **kwargs)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        project = self.get_object()
        denied = self._forbid_unless_owner(project, "edit")
        if denied:
            return denied

        data = _project_data(request)
        authors = None
        if "authors" in data:
            data["authors"], *authors = _parse_authors(request.user, data["authors"])

        old_image = project.imgFile.name if "imgFile" in data and project.imgFile else None
        serializer = self.get_serializer(project, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        links = serializer.validated_data.pop("links", None)
        translations = serializer.validated_data.pop("translations", None)
        project = serializer.save()
        if authors is not None:
            _apply_authors(project, *authors)
        serializer.save_related(project, links=links, translations=translations)
        if old_image and old_image != project.imgFile.name:
            transaction.on_commit(lambda: project.imgFile.storage.delete(old_image))
        return Response(self._fresh(project))

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        denied = self._forbid_unless_owner(project, "delete")
        if denied:
            return denied
        files = [project.imgFile] + [image.image for image in project.images.all()]
        project.delete()
        for file in files:
            if file:
                file.delete(save=False)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, url_path="user/(?P<github_username>[^/]+)")
    def user_projects(self, request, github_username=None):
        """Projects someone owns, co-authored, or was invited to (pending)."""
        username = github_username.lower()
        projects = self.get_queryset().filter(
            Q(user__username=username)
            | Q(users__username=username)
            | Q(invites__github_username=username, invites__status=CoauthorInvite.PENDING)
        ).distinct()
        return Response(self.get_serializer(projects, many=True).data)

    @action(detail=False, methods=["post"])
    @transaction.atomic
    def reorder(self, request):
        """Body: [{"id": 4, "order": 0, "featured": true}, ...] — the caller's own projects only."""
        items = request.data if isinstance(request.data, list) else []
        mine = {p.id: p for p in Project.objects.filter(user=request.user, id__in=[i.get("id") for i in items])}
        if len(mine) != len(items):
            return Response({"detail": "Unknown or foreign project ids."}, status=status.HTTP_400_BAD_REQUEST)
        for item in items:
            project = mine[item["id"]]
            project.order = int(item.get("order", project.order))
            project.featured = bool(item.get("featured", project.featured))
            project.save(update_fields=["order", "featured"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        """Toggle the signed-in user's like."""
        project = self.get_object()
        if project.likes.filter(pk=request.user.pk).exists():
            project.likes.remove(request.user)
            message = "You disliked this project"
        else:
            project.likes.add(request.user)
            message = "You liked this project"
        return Response({"status": message, "likes_count": project.total_likes()})


def portfolio_projects(user):
    """A user's own and co-authored projects in portfolio order: featured first."""
    return (
        project_queryset()
        .filter(Q(user=user) | Q(users=user))
        .distinct()
        .order_by("-featured", "order", "-id")
    )


@api_view(["GET"])
def portfolio(request, handle):
    """Everything the public portfolio page needs, in one request."""
    user = user_by_handle(handle)
    projects = portfolio_projects(user)
    return Response({
        "user": PublicUserSerializer(user).data,
        "projects": ProjectSerializer(projects, many=True).data,
    })


@api_view(["GET"])
def portfolio_project(request, handle, slug):
    """One project by its owner's handle and its slug (the case-study permalink)."""
    user = user_by_handle(handle)
    project = get_object_or_404(portfolio_projects(user), slug=slug.lower())
    return Response({
        "user": PublicUserSerializer(user).data,
        "project": ProjectSerializer(project).data,
    })


class IsCommentAuthorOrProjectOwner(permissions.BasePermission):
    """Authors may edit their comments; authors and the project owner may delete them."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if view.action == "hide":
            return obj.project.user_id == request.user.id
        if obj.user_id == request.user.id:
            return True
        return request.method == "DELETE" and obj.project.user_id == request.user.id


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCommentAuthorOrProjectOwner]

    def get_queryset(self):
        queryset = (
            Comment.objects.filter(project_id=self.kwargs["project_pk"])
            .select_related("user__profile", "project")
            .order_by("-created_at")
        )
        # Hidden comments are visible only to the project owner (to un-hide them).
        project = Project.objects.filter(pk=self.kwargs["project_pk"]).only("user_id").first()
        if not (project and self.request.user.is_authenticated and project.user_id == self.request.user.id):
            queryset = queryset.filter(hidden=False)
        return queryset

    def perform_create(self, serializer):
        project = get_object_or_404(Project, id=self.kwargs["project_pk"])
        serializer.save(user=self.request.user, project=project)

    @action(detail=True, methods=["post"])
    def hide(self, request, project_pk=None, pk=None):
        """Project owner toggles a comment's visibility."""
        comment = self.get_object()
        comment.hidden = not comment.hidden
        comment.save(update_fields=["hidden"])
        return Response(self.get_serializer(comment).data)
