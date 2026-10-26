from django.db import migrations
from django.utils.text import slugify


def fill(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    ProjectLink = apps.get_model("projects", "ProjectLink")
    CoauthorInvite = apps.get_model("projects", "CoauthorInvite")
    Profile = apps.get_model("backend", "Profile")

    with_profile = set(Profile.objects.values_list("user_id", flat=True))
    taken = {}
    for project in Project.objects.order_by("id"):
        # Slug: unique per owner, kept stable afterwards.
        if not project.slug:
            owner_slugs = taken.setdefault(
                project.user_id,
                set(Project.objects.filter(user_id=project.user_id).exclude(slug="").values_list("slug", flat=True)),
            )
            base = slugify(project.projectTitle)[:100] or "project"
            slug, n = base, 2
            while slug in owner_slugs:
                slug, n = f"{base}-{n}", n + 1
            owner_slugs.add(slug)
            project.slug = slug
            project.save(update_fields=["slug"])

        # Links: mirror the legacy URL fields.
        if project.githubRepos and not ProjectLink.objects.filter(project=project, kind="code").exists():
            ProjectLink.objects.create(project=project, kind="code", url=project.githubRepos, order=0)
        if project.liveProject and not ProjectLink.objects.filter(project=project, kind="live").exists():
            ProjectLink.objects.create(project=project, kind="live", url=project.liveProject, order=1)

        # Co-authors who never signed in (placeholder accounts) get an invite.
        # The placeholder accounts stay for now; they are cleaned up after the move.
        for user in project.users.exclude(id__in=with_profile):
            CoauthorInvite.objects.get_or_create(project=project, github_username=user.username.lower())


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0005_portfolio_fields"),
        ("backend", "0003_fill_handles_and_memberships"),
    ]
    operations = [migrations.RunPython(fill, migrations.RunPython.noop)]
