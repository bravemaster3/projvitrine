from django.contrib import admin

from .models import CoauthorInvite, Comment, Project, ProjectImage, ProjectLink, ProjectTranslation


class LinkInline(admin.TabularInline):
    model = ProjectLink
    extra = 0


class ImageInline(admin.TabularInline):
    model = ProjectImage
    extra = 0


class TranslationInline(admin.StackedInline):
    model = ProjectTranslation
    extra = 0


class InviteInline(admin.TabularInline):
    model = CoauthorInvite
    extra = 0
    readonly_fields = ["claimed_by", "created_at"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["projectTitle", "user", "slug", "featured", "order"]
    list_filter = ["featured"]
    search_fields = ["projectTitle", "user__username", "tags"]
    inlines = [LinkInline, ImageInline, TranslationInline, InviteInline]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["project", "user", "created_at", "hidden"]
    list_filter = ["hidden"]
