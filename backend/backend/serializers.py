from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from .models import CONTACT_CHOICES, Community, Membership, Profile, ProfileTranslation

LEGACY_PROFILE_FIELDS = [
    "full_name", "location", "cohort", "bio", "facebook", "twitter", "linkedin", "avatar", "updated",
]
PORTFOLIO_FIELDS = ["handle", "headline", "website", "orcid", "scholar", "open_to_work", "default_lang"]
PROFILE_FIELDS = LEGACY_PROFILE_FIELDS + PORTFOLIO_FIELDS
NULLABLE_FIELDS = ["bio", "facebook", "twitter", "linkedin"]
EMPTY_PROFILE = {
    "full_name": "", "location": "", "cohort": "", "bio": "",
    "facebook": None, "twitter": None, "linkedin": None, "avatar": None, "updated": False,
    "handle": None, "headline": "", "website": "", "orcid": "", "scholar": "",
    "open_to_work": False, "default_lang": "", "memberships": [], "translations": {}, "contact": None,
}


class CommunitySerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Community
        fields = ["id", "name", "slug", "description", "website", "logo", "member_count"]


class MembershipSerializer(serializers.ModelSerializer):
    community = serializers.SlugRelatedField(slug_field="slug", queryset=Community.objects.all())
    community_name = serializers.CharField(source="community.name", read_only=True)

    class Meta:
        model = Membership
        fields = ["community", "community_name", "label", "start", "end"]


def translations_dict(profile):
    return {t.lang: {"headline": t.headline, "bio": t.bio} for t in profile.translations.all()}


def validate_translations(value, fields):
    """{"fr": {"headline": "...", "bio": "..."}} with known languages and fields only."""
    if not isinstance(value, dict):
        raise serializers.ValidationError("Expected an object keyed by language code.")
    for lang, texts in value.items():
        if lang not in settings.LANGS:
            raise serializers.ValidationError(f"Unsupported language “{lang}”. Supported: {', '.join(settings.LANGS)}.")
        if not isinstance(texts, dict) or set(texts) - set(fields):
            raise serializers.ValidationError(f"Translations accept only: {', '.join(fields)}.")
    return value


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
    handle = serializers.CharField(source="profile.handle", read_only=True)
    headline = serializers.CharField(source="profile.headline", read_only=True)
    website = serializers.CharField(source="profile.website", read_only=True)
    orcid = serializers.CharField(source="profile.orcid", read_only=True)
    scholar = serializers.CharField(source="profile.scholar", read_only=True)
    open_to_work = serializers.BooleanField(source="profile.open_to_work", read_only=True)
    default_lang = serializers.CharField(source="profile.default_lang", read_only=True)
    memberships = MembershipSerializer(many=True, read_only=True)
    translations = serializers.SerializerMethodField()
    contact = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", *PROFILE_FIELDS, "memberships", "translations", "contact"]

    def get_translations(self, user):
        return translations_dict(user.profile)

    def get_contact(self, user):
        return user.profile.contact()

    def to_representation(self, instance):
        if not hasattr(instance, "profile"):
            # Placeholder accounts (co-authors who never logged in) have no profile.
            return {"id": instance.id, "username": instance.username, **EMPTY_PROFILE}
        return super().to_representation(instance)


class CompactUserSerializer(PublicUserSerializer):
    """Smaller public user for lists (project authors, comments)."""

    class Meta(PublicUserSerializer.Meta):
        fields = ["id", "username", *LEGACY_PROFILE_FIELDS, "handle", "headline"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {key: data[key] for key in self.Meta.fields}


class UserSerializer(serializers.ModelSerializer):
    """The signed-in user's own account, including email. Used for profile reads and updates."""

    full_name = serializers.CharField(source="profile.full_name", required=False, allow_blank=True)
    location = serializers.CharField(source="profile.location", required=False, allow_blank=True)
    cohort = serializers.CharField(source="profile.cohort", required=False, allow_blank=True)
    bio = serializers.CharField(source="profile.bio", required=False, allow_blank=True, allow_null=True)
    facebook = serializers.URLField(source="profile.facebook", required=False, allow_blank=True, allow_null=True)
    twitter = serializers.URLField(source="profile.twitter", required=False, allow_blank=True, allow_null=True)
    linkedin = serializers.URLField(source="profile.linkedin", required=False, allow_blank=True, allow_null=True)
    avatar = serializers.URLField(source="profile.avatar", read_only=True)
    updated = serializers.BooleanField(source="profile.updated", read_only=True)
    handle = serializers.CharField(source="profile.handle", required=False, max_length=39)
    headline = serializers.CharField(source="profile.headline", required=False, allow_blank=True, max_length=160)
    website = serializers.URLField(source="profile.website", required=False, allow_blank=True)
    orcid = serializers.CharField(source="profile.orcid", required=False, allow_blank=True)
    scholar = serializers.URLField(source="profile.scholar", required=False, allow_blank=True)
    open_to_work = serializers.BooleanField(source="profile.open_to_work", required=False)
    default_lang = serializers.CharField(source="profile.default_lang", required=False)
    contact_email = serializers.EmailField(source="profile.contact_email", required=False, allow_blank=True)
    contact_via = serializers.ChoiceField(
        source="profile.contact_via", choices=CONTACT_CHOICES, required=False, allow_blank=True
    )
    memberships = MembershipSerializer(many=True, required=False)
    translations = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", *PROFILE_FIELDS, "contact_email", "contact_via", "memberships", "translations",
        ]
        read_only_fields = ["id", "username"]

    def to_internal_value(self, data):
        data = data.copy()
        for field in NULLABLE_FIELDS:
            if data.get(field) == "":
                data[field] = None
        return super().to_internal_value(data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["translations"] = translations_dict(instance.profile)
        return data

    def validate_handle(self, value):
        value = value.lower()
        try:
            Profile._meta.get_field("handle").run_validators(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages) from error
        clash = Profile.objects.filter(handle__iexact=value).exclude(user=self.instance)
        if clash.exists():
            raise serializers.ValidationError("This handle is taken.")
        return value

    def validate_orcid(self, value):
        if value:
            try:
                Profile._meta.get_field("orcid").run_validators(value)
            except DjangoValidationError as error:
                raise serializers.ValidationError(error.messages) from error
        return value

    def validate_default_lang(self, value):
        if value not in settings.LANGS:
            raise serializers.ValidationError(f"Supported: {', '.join(settings.LANGS)}.")
        return value

    def validate_translations(self, value):
        return validate_translations(value, ["headline", "bio"])

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        memberships = validated_data.pop("memberships", None)
        translations = validated_data.pop("translations", None)

        if "email" in validated_data:
            instance.email = validated_data["email"]
            instance.save(update_fields=["email"])

        profile = instance.profile
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.updated = True
        profile.save()

        if memberships is not None:
            instance.memberships.all().delete()
            for item in memberships:
                Membership.objects.create(user=instance, **item)

        if translations is not None:
            for lang, texts in translations.items():
                if not any((texts.get(k) or "").strip() for k in ("headline", "bio")):
                    profile.translations.filter(lang=lang).delete()
                    continue
                ProfileTranslation.objects.update_or_create(
                    profile=profile, lang=lang,
                    defaults={"headline": texts.get("headline", ""), "bio": texts.get("bio", "")},
                )
        return instance
