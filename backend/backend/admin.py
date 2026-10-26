from django.contrib import admin

from .models import Community, Membership, Profile, ProfileTranslation


class ProfileTranslationInline(admin.TabularInline):
    model = ProfileTranslation
    extra = 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "handle", "full_name", "location", "open_to_work"]
    search_fields = ["user__username", "handle", "full_name"]
    inlines = [ProfileTranslationInline]


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    autocomplete_fields = ["user"]


@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "website"]
    prepopulated_fields = {"slug": ["name"]}
    inlines = [MembershipInline]
