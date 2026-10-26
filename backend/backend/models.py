from django.contrib.auth.models import User
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=255)
    location = models.CharField(max_length=100, blank=True)
    cohort = models.CharField(max_length=100, default="", blank=True)
    updated = models.BooleanField(default=False)  # New field to track manual updates
    bio = models.TextField(max_length=1000, null=True, blank=True)  # New bio field
    facebook = models.URLField(max_length=200, null=True, blank=True)
    twitter = models.URLField(max_length=200, null=True, blank=True)
    linkedin = models.URLField(max_length=200, null=True, blank=True)
    avatar = models.URLField(max_length=200, null=True, blank=True)

    def __str__(self):
        return self.user.username
