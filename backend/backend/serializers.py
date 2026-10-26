from django.contrib.auth.models import User
from rest_framework import serializers

PROFILE_FIELDS = ["full_name", "location", "cohort", "bio", "facebook", "twitter", "linkedin", "avatar", "updated"]
NULLABLE_FIELDS = ["bio", "facebook", "twitter", "linkedin"]
EMPTY_PROFILE = {
    "full_name": "", "location": "", "cohort": "", "bio": "",
    "facebook": None, "twitter": None, "linkedin": None, "avatar": None, "updated": False,
}


class PublicUserSerializer(serializers.ModelSerializer):
    """User as anyone may see it. Never includes the email address."""

    full_name = serializers.CharField(source="profile.full_name", read_only=True)
    location = serializers.CharField(source="profile.location", read_only=True)
    cohort = serializers.CharField(source="profile.cohort", read_only=True)
    bio = serializers.CharField(source="profile.bio", read_only=True)
    facebook = serializers.URLField(source="profile.facebook", read_only=True)
    twitter = serializers.URLField(source="profile.twitter", read_only=True)
    linkedin = serializers.URLField(source="profile.linkedin", read_only=True)
    avatar = serializers.URLField(source="profile.avatar", read_only=True)
    updated = serializers.BooleanField(source="profile.updated", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", *PROFILE_FIELDS]

    def to_representation(self, instance):
        if not hasattr(instance, "profile"):
            # Placeholder accounts (co-authors who never logged in) have no profile.
            return {"id": instance.id, "username": instance.username, **EMPTY_PROFILE}
        return super().to_representation(instance)


class UserSerializer(serializers.ModelSerializer):
    """The signed-in user's own account, including email. Used for profile updates."""

    full_name = serializers.CharField(source="profile.full_name", required=False, allow_blank=True)
    location = serializers.CharField(source="profile.location", required=False, allow_blank=True)
    cohort = serializers.CharField(source="profile.cohort", required=False, allow_blank=True)
    bio = serializers.CharField(source="profile.bio", required=False, allow_blank=True, allow_null=True)
    facebook = serializers.URLField(source="profile.facebook", required=False, allow_blank=True, allow_null=True)
    twitter = serializers.URLField(source="profile.twitter", required=False, allow_blank=True, allow_null=True)
    linkedin = serializers.URLField(source="profile.linkedin", required=False, allow_blank=True, allow_null=True)
    avatar = serializers.URLField(source="profile.avatar", read_only=True)
    updated = serializers.BooleanField(source="profile.updated", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", *PROFILE_FIELDS]
        read_only_fields = ["id", "username"]

    def to_internal_value(self, data):
        data = data.copy()
        for field in NULLABLE_FIELDS:
            if data.get(field) == "":
                data[field] = None
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        if "email" in validated_data:
            instance.email = validated_data["email"]
            instance.save(update_fields=["email"])

        profile = instance.profile
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.updated = True
        profile.save()
        return instance
