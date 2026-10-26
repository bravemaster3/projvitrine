import re

from django.db import migrations

RESERVED = {
    "admin", "api", "about", "c", "explore", "login", "logout", "map", "me", "media",
    "new", "people", "portfolios", "profile", "projects", "settings", "signup", "static", "u",
}
VALID = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$")


def fill(apps, schema_editor):
    Profile = apps.get_model("backend", "Profile")
    Community = apps.get_model("backend", "Community")
    Membership = apps.get_model("backend", "Membership")

    taken = {h.lower() for h in Profile.objects.exclude(handle__isnull=True).values_list("handle", flat=True)}
    for profile in Profile.objects.select_related("user").filter(handle__isnull=True).order_by("id"):
        base = re.sub(r"[^a-z0-9-]", "-", profile.user.username.lower()).strip("-")[:36] or "user"
        if not VALID.match(base) or base in RESERVED:
            base = f"{base}-1"
        handle, n = base, 2
        while handle in taken:
            handle, n = f"{base}-{n}", n + 1
        taken.add(handle)
        profile.handle = handle
        profile.save(update_fields=["handle"])

    # Legacy "cohort" values ("C16") become memberships of an ALX community.
    cohorts = Profile.objects.exclude(cohort="").exclude(cohort__iexact="Non-ALX")
    if cohorts.exists():
        alx, _ = Community.objects.get_or_create(
            slug="alx", defaults={"name": "ALX", "website": "https://www.alxafrica.com/"}
        )
        for profile in cohorts:
            match = re.fullmatch(r"[Cc](\d+)", profile.cohort.strip())
            label = f"Cohort {match.group(1)}" if match else profile.cohort.strip()
            Membership.objects.get_or_create(user_id=profile.user_id, community=alx, defaults={"label": label})


class Migration(migrations.Migration):
    dependencies = [("backend", "0002_portfolio_profile_communities")]
    operations = [migrations.RunPython(fill, migrations.RunPython.noop)]
