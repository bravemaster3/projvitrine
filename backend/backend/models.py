import base64

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower

orcid_validator = RegexValidator(r"^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$", "ORCID iDs look like 0000-0002-1825-0097.")
handle_validator = RegexValidator(
    r"^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$",
    "Use 1–39 lowercase letters, digits or hyphens, not starting or ending with a hyphen.",
)

# Handles that would clash with app routes.
RESERVED_HANDLES = {
    "admin", "api", "about", "c", "explore", "login", "logout", "map", "me", "media",
    "new", "people", "portfolios", "profile", "projects", "settings", "signup", "static", "u",
}


def validate_handle(value):
    if value in RESERVED_HANDLES:
        raise ValidationError(f"“{value}” is reserved.")


CONTACT_CHOICES = [
    ("", "Automatic"),
    ("mail", "Email"),
    ("linkedin", "LinkedIn"),
    ("website", "Website"),
    ("github", "GitHub"),
    ("none", "Hidden"),
]
CONTACT_ORDER = ["mail", "linkedin", "website", "github"]


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=255)
    location = models.CharField(max_length=100, blank=True)
    # Legacy ALX cohort ("C16"); converted to a Membership, kept until the frontend moves over.
    cohort = models.CharField(max_length=100, default="", blank=True)
    updated = models.BooleanField(default=False)  # True once the user edited their profile
    bio = models.TextField(max_length=1000, null=True, blank=True)
    facebook = models.URLField(max_length=200, null=True, blank=True)
    twitter = models.URLField(max_length=200, null=True, blank=True)
    linkedin = models.URLField(max_length=200, null=True, blank=True)
    avatar = models.URLField(max_length=200, null=True, blank=True)

    # Portfolio fields
    handle = models.CharField(
        max_length=39, null=True, blank=True, validators=[handle_validator, validate_handle],
        help_text="Public URL name: /u/<handle>. Defaults to the GitHub username.",
    )
    headline = models.CharField(max_length=160, blank=True, default="")
    website = models.URLField(max_length=200, blank=True, default="")
    orcid = models.CharField(max_length=19, blank=True, default="", validators=[orcid_validator])
    scholar = models.URLField(max_length=200, blank=True, default="")
    open_to_work = models.BooleanField(default=False)
    default_lang = models.CharField(max_length=8, default="en", help_text="Language the user writes in.")
    contact_email = models.EmailField(
        blank=True, default="", help_text="Public contact address (the account email stays private)."
    )
    contact_via = models.CharField(
        max_length=10, choices=CONTACT_CHOICES, blank=True, default="",
        help_text="Where 'Get in touch' leads. Empty: the first available of email, LinkedIn, website, GitHub.",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("handle"), name="unique_profile_handle_ci"),
        ]

    def __str__(self):
        return self.user.username

    def contact(self):
        """The public 'Get in touch' target, or None when hidden.

        The email is reversed and base64-encoded so it does not appear in plain
        text for scrapers; the page decodes it only when the button is clicked.
        """
        if self.contact_via == "none":
            return None
        targets = {
            "mail": self.contact_email,
            "linkedin": self.linkedin,
            "website": self.website,
            "github": f"https://github.com/{self.user.username}",
        }
        via = self.contact_via if targets.get(self.contact_via) else next(k for k in CONTACT_ORDER if targets[k])
        if via == "mail":
            return {"via": via, "code": base64.b64encode(targets[via][::-1].encode()).decode()}
        return {"via": via, "href": targets[via]}

    def save(self, *args, **kwargs):
        if not self.handle:
            self.handle = self.user.username.lower()
        else:
            self.handle = self.handle.lower()
        super().save(*args, **kwargs)


class ProfileTranslation(models.Model):
    """Headline and bio in another language than the profile's default."""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="translations")
    lang = models.CharField(max_length=8)
    headline = models.CharField(max_length=160, blank=True, default="")
    bio = models.TextField(max_length=1000, blank=True, default="")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["profile", "lang"], name="unique_profile_translation")]

    def __str__(self):
        return f"{self.profile} [{self.lang}]"


class Community(models.Model):
    """A group people belong to: a bootcamp, school, employer, research group…"""

    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=60, unique=True)
    description = models.TextField(blank=True, default="")
    website = models.URLField(max_length=200, blank=True, default="")
    logo = models.ImageField(upload_to="community_logos/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "communities"

    def __str__(self):
        return self.name


class Membership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name="memberships")
    label = models.CharField(max_length=80, blank=True, default="", help_text='e.g. "Cohort 16", "PhD student"')
    start = models.DateField(null=True, blank=True)
    end = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["community__name"]
        constraints = [models.UniqueConstraint(fields=["user", "community"], name="unique_membership")]

    def __str__(self):
        return f"{self.user} @ {self.community}" + (f" ({self.label})" if self.label else "")
