from django.conf import settings
from rest_framework import serializers

from backend.serializers import PublicUserSerializer

from .models import Comment, Project


class CommentSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    project = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "project", "user", "content", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    users = PublicUserSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "user", "users", "projectTitle", "authors", "description",
            "tags", "githubRepos", "liveProject", "imgFile", "likes", "comments",
            "total_likes", "likes_count",
        ]
        read_only_fields = ["likes"]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Relative media path; the frontend prefixes it with its own origin.
        representation["imgFile"] = f"{settings.MEDIA_URL}{instance.imgFile.name}" if instance.imgFile else None
        return representation

    def get_likes_count(self, obj):
        return obj.total_likes()
