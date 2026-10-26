from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from .views import CommentViewSet, ProjectViewSet

# Create a router and register the ProjectViewSet with it.
router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')

# Register CommentViewSet with nested route under projects
project_router = NestedDefaultRouter(router, r'projects', lookup='project')
project_router.register(r'comments', CommentViewSet, basename='project-comments')
urlpatterns = [
    # Include the routes for the ProjectViewSet
    path('', include(router.urls)),
    # Include the nested routes for the comments
    path('', include(project_router.urls)),
]
