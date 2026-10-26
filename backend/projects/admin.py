#projects.admin.py
from django.contrib import admin

from .models import Project  # Import your models

# Register your models here
admin.site.register(Project)