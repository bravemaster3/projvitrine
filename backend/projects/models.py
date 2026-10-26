#projects.models
from django.contrib.auth.models import User
from django.db import models


class Project(models.Model):
    """Project class definition"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_projects")
    users = models.ManyToManyField(User, related_name='projects')
    projectTitle = models.CharField(max_length=100)
    authors = models.CharField(max_length=255)
    description = models.TextField()
    tags = models.CharField(max_length=255)
    githubRepos = models.URLField()
    liveProject = models.URLField(blank=True)
    imgFile = models.ImageField(upload_to='project_images/')
    likes = models.ManyToManyField(User, related_name='liked_projects', blank=True)

    def __str__(self):
        return self.projectTitle

    def total_likes(self):
        return self.likes.count()

class Comment(models.Model):
    """Comments class definition"""
    project = models.ForeignKey(Project, related_name='comments', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.project.projectTitle}'
