from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_projects")
    users = models.ManyToManyField(User, related_name="projects")
    projectTitle = models.CharField(max_length=100)
    authors = models.CharField(max_length=255)
    description = models.TextField()  # short summary shown on cards
    tags = models.CharField(max_length=255)
    # Legacy single links; mirrored into ProjectLink rows (see sync_primary_links).
    githubRepos = models.URLField()
    liveProject = models.URLField(blank=True)
    imgFile = models.ImageField(upload_to="project_images/")  # cover image
    likes = models.ManyToManyField(User, related_name="liked_projects", blank=True)

    # Portfolio / case-study fields
    slug = models.SlugField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(null=True, blank=True, default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True, auto_now=True)
    featured = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0, help_text="Position on the owner's portfolio (ascending).")
    role = models.CharField(max_length=120, blank=True, default="")
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True, help_text="Empty with a start date means ongoing.")
    body = models.TextField(blank=True, default="", help_text="Case study in Markdown.")
    lang = models.CharField(max_length=8, blank=True, default="", help_text="Language of the text; empty = owner's.")

    class Meta:
        ordering = ["order", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "slug"], condition=~models.Q(slug=""), name="unique_project_slug_per_owner"
            ),
        ]

    def __str__(self):
        return self.projectTitle

    def total_likes(self):
        return self.likes.count()

    def save(self, *args, **kwargs):
        # The slug is set once and then kept, so permalinks survive title changes.
        if not self.slug:
            self.slug = unique_slug(self.user_id, self.projectTitle, exclude_pk=self.pk)
        super().save(*args, **kwargs)

    def sync_primary_links(self):
        """Keep the code/live ProjectLink rows in step with the legacy URL fields."""
        for kind, url in ((ProjectLink.CODE, self.githubRepos), (ProjectLink.LIVE, self.liveProject)):
            primary = self.links.filter(kind=kind).order_by("order", "id").first()
            if url and primary:
                if primary.url != url:
                    primary.url = url
                    primary.save(update_fields=["url"])
            elif url:
                self.links.create(kind=kind, url=url, order=0)
            elif primary:
                primary.delete()


def unique_slug(owner_id, title, exclude_pk=None, model=None):
    model = model or Project
    base = slugify(title)[:100] or "project"
    taken = set(model.objects.filter(user_id=owner_id, slug__startswith=base).exclude(pk=exclude_pk)
                .values_list("slug", flat=True))
    slug, n = base, 2
    while slug in taken:
        slug, n = f"{base}-{n}", n + 1
    return slug


class ProjectLink(models.Model):
    CODE, LIVE, DOCS, PAPER, VIDEO, OTHER = "code", "live", "docs", "paper", "video", "other"
    KINDS = [(CODE, "Code"), (LIVE, "Live"), (DOCS, "Docs"), (PAPER, "Paper / DOI"), (VIDEO, "Video"), (OTHER, "Other")]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="links")
    kind = models.CharField(max_length=10, choices=KINDS, default=OTHER)
    url = models.URLField(max_length=500)
    label = models.CharField(max_length=80, blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.project} · {self.kind}"


class ProjectImage(models.Model):
    """Gallery screenshots; the cover stays in Project.imgFile."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="project_images/gallery/")
    caption = models.CharField(max_length=200, blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.project} · image {self.pk}"


class ProjectTranslation(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="translations")
    lang = models.CharField(max_length=8)
    title = models.CharField(max_length=100, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    body = models.TextField(blank=True, default="")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["project", "lang"], name="unique_project_translation")]

    def __str__(self):
        return f"{self.project} [{self.lang}]"


class CoauthorInvite(models.Model):
    """A co-author named by GitHub username who has not joined (yet)."""

    PENDING, ACCEPTED, DECLINED = "pending", "accepted", "declined"
    STATUSES = [(PENDING, "Pending"), (ACCEPTED, "Accepted"), (DECLINED, "Declined")]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="invites")
    github_username = models.CharField(max_length=39)
    status = models.CharField(max_length=10, choices=STATUSES, default=PENDING)
    claimed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["project", "github_username"], name="unique_coauthor_invite"),
        ]

    def __str__(self):
        return f"{self.github_username} → {self.project} ({self.status})"


class Comment(models.Model):
    project = models.ForeignKey(Project, related_name="comments", on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    hidden = models.BooleanField(default=False, help_text="Hidden by the project owner.")

    def __str__(self):
        return f"{self.user.username} - {self.project.projectTitle}"
