from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

schema_view = get_schema_view(
    openapi.Info(title="Showcase API", default_version="v1", license=openapi.License(name="MIT")),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("api/admin/", admin.site.urls),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/callback", views.github_callback, name="github_callback"),
    path("api/users", views.all_users, name="all_users"),
    path("api/users/<int:user_id>", views.get_user, name="specific_user"),
    path(
        "api/users/github/<str:github_username>/",
        views.get_user_by_github_username,
        name="get_user_by_github_username",
    ),
    path("api/users/update/", views.update_profile, name="update_profile"),
    path("api/users_with_profiles/", views.get_all_users_with_profiles, name="get_all_users_with_profiles"),
    path("api/", include("projects.urls")),
    path("api/swagger/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    path("api/redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
