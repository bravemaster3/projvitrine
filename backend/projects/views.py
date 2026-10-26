from django.contrib.auth.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Comment, Project
from .serializers import CommentSerializer, ProjectSerializer

PUBLIC_ACTIONS = {"list", "retrieve", "user_projects"}
WRITABLE_FIELDS = ["projectTitle", "authors", "description", "tags", "githubRepos", "liveProject"]


def _resolve_authors(owner, authors):
    """Turn a comma-separated list of GitHub usernames into users, owner first.

    Unknown usernames still get a placeholder account for now; phase 2 replaces
    these with co-author invites.
    """
    usernames = []
    for name in (authors or "").split(","):
        name = name.strip().lower()
        if name and name not in usernames:
            usernames.append(name)
    if owner.username not in usernames:
        usernames.insert(0, owner.username)
    users = [User.objects.get_or_create(username=name)[0] for name in usernames]
    return ", ".join(usernames), users


def _project_data(request):
    """Plain dict of the writable fields, plus the uploaded image if there is one."""
    data = {field: request.data[field] for field in WRITABLE_FIELDS if field in request.data}
    if "imgFile" in request.FILES:
        data["imgFile"] = request.FILES["imgFile"]
    return data


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    queryset = (
        Project.objects.select_related("user__profile")
        .prefetch_related("users__profile", "likes", "comments__user__profile")
        .order_by("-id")
    )

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

    def create(self, request, *args, **kwargs):
        data = _project_data(request)
        data["authors"], author_users = _resolve_authors(request.user, data.get("authors"))
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save(user=request.user)
        project.users.set(author_users)
        return Response(self.get_serializer(project).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def create_with_token(self, request, *args, **kwargs):
        """Kept for the current frontend; same as POST /api/projects/."""
        return self.create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        denied = self._forbid_unless_owner(project, "edit")
        if denied:
            return denied

        data = _project_data(request)
        if "authors" in data:
            data["authors"], author_users = _resolve_authors(request.user, data["authors"])
        else:
            author_users = None

        old_image = project.imgFile.name if "imgFile" in data and project.imgFile else None
        serializer = self.get_serializer(project, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        if author_users is not None:
            project.users.set(author_users)
        if old_image and old_image != project.imgFile.name:
            project.imgFile.storage.delete(old_image)
        return Response(self.get_serializer(project).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        denied = self._forbid_unless_owner(project, "delete")
        if denied:
            return denied
        if project.imgFile:
            project.imgFile.delete(save=False)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, url_path="user/(?P<github_username>[^/]+)")
    def user_projects(self, request, github_username=None):
        username = github_username.lower()
        projects = self.get_queryset().filter(Q(user__username=username) | Q(users__username=username)).distinct()
        return Response(self.get_serializer(projects, many=True).data)

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


class IsCommentAuthorOrProjectOwner(permissions.BasePermission):
    """Authors may edit their comments; authors and the project owner may delete them."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if obj.user_id == request.user.id:
            return True
        return request.method == "DELETE" and obj.project.user_id == request.user.id


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCommentAuthorOrProjectOwner]

    def get_queryset(self):
        return (
            Comment.objects.filter(project_id=self.kwargs["project_pk"])
            .select_related("user__profile", "project")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        project = get_object_or_404(Project, id=self.kwargs["project_pk"])
        serializer.save(user=self.request.user, project=project)
