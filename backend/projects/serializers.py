import json

from django.conf import settings
from rest_framework import serializers

from backend.serializers import CompactUserSerializer, validate_translations

from .models import CoauthorInvite, Comment, Project, ProjectImage, ProjectLink, ProjectTranslation


def media_url(field):
    # Relative media path; the frontend prefixes it with its own origin.
    return f"{settings.MEDIA_URL}{field.name}" if field else None


class CommentSerializer(serializers.ModelSerializer):
    user = CompactUserSerializer(read_only=True)
    project = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "project", "user", "content", "created_at", "hidden"]
        read_only_fields = ["hidden"]


class ProjectLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectLink
        fields = ["id", "kind", "url", "label", "order"]


class ProjectImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectImage
        fields = ["id", "image", "caption", "order"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["image"] = media_url(instance.image)
        return data


class CoauthorInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoauthorInvite
        fields = ["github_username", "status"]


class JSONStringField(serializers.JSONField):
    """Accepts JSON values, or JSON text (multipart form fields arrive as strings)."""

    def to_internal_value(self, data):
        if isinstance(data, str):
            try:
                data = json.loads(data) if data.strip() else None
            except ValueError as error:
                raise serializers.ValidationError("Invalid JSON.") from error
        return super().to_internal_value(data)


class ProjectSerializer(serializers.ModelSerializer):
    user = CompactUserSerializer(read_only=True)
    users = CompactUserSerializer(many=True, read_only=True)
    comments = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    links = JSONStringField(required=False)
    images = ProjectImageSerializer(many=True, read_only=True)
    invites = CoauthorInviteSerializer(many=True, read_only=True)
    translations = JSONStringField(required=False)

    class Meta:
        model = Project
        fields = [
            "id", "user", "users", "projectTitle", "authors", "description",
            "tags", "githubRepos", "liveProject", "imgFile", "likes", "comments",
            "total_likes", "likes_count",
            "slug", "created_at", "updated_at", "featured", "order", "role",
            "period_start", "period_end", "body", "lang", "links", "images", "invites", "translations",
        ]
        read_only_fields = ["likes", "slug", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["imgFile"] = media_url(instance.imgFile)
        data["links"] = ProjectLinkSerializer(instance.links.all(), many=True).data
        data["translations"] = {
            t.lang: {"title": t.title, "summary": t.summary, "body": t.body} for t in instance.translations.all()
        }
        return data

    def get_comments(self, project):
        visible = [c for c in project.comments.all() if not c.hidden]
        return CommentSerializer(visible, many=True).data

    def get_likes_count(self, obj):
        return obj.total_likes()

    def validate_links(self, value):
        if value is None:
            return []
        serializer = ProjectLinkSerializer(data=value, many=True)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def validate_translations(self, value):
        return validate_translations(value or {}, ["title", "summary", "body"])

    def validate_lang(self, value):
        if value and value not in settings.LANGS:
            raise serializers.ValidationError(f"Supported: {', '.join(settings.LANGS)}.")
        return value

    def validate(self, attrs):
        start = attrs.get("period_start", getattr(self.instance, "period_start", None))
        end = attrs.get("period_end", getattr(self.instance, "period_end", None))
        if start and end and end < start:
            raise serializers.ValidationError({"period_end": "Ends before it starts."})
        return attrs

    def save_related(self, project, links=None, translations=None):
        """Write links and translations, keeping legacy URL fields and links in step."""
        if links is not None:
            project.links.all().delete()
            for index, item in enumerate(links):
                ProjectLink.objects.create(project=project, order=item.get("order", index), **{
                    k: v for k, v in item.items() if k != "order"
                })
            code = next((link["url"] for link in links if link["kind"] == ProjectLink.CODE), "")
            live = next((link["url"] for link in links if link["kind"] == ProjectLink.LIVE), "")
            if (code, live) != (project.githubRepos, project.liveProject):
                project.githubRepos, project.liveProject = code or project.githubRepos, live
                project.save(update_fields=["githubRepos", "liveProject"])
        else:
            project.sync_primary_links()

        if translations is not None:
            for lang, texts in translations.items():
                if not any((texts.get(k) or "").strip() for k in ("title", "summary", "body")):
                    project.translations.filter(lang=lang).delete()
                    continue
                ProjectTranslation.objects.update_or_create(
                    project=project, lang=lang,
                    defaults={k: texts.get(k, "") for k in ("title", "summary", "body")},
                )
