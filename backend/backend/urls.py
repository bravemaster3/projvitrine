from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from rest_framework_simplejwt.views import TokenRefreshView

from projects import views as project_views

from . import meta, views

schema_view = get_schema_view(
    openapi.Info(title="Showcase API", default_version="v1", license=openapi.License(name="MIT")),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("api/admin/", admin.site.urls),
    path("api/health/", views.health, name="health"),
    path("api/communities/", views.communities, name="communities"),
    path("api/communities/<slug:slug>/", views.community_detail, name="community_detail"),
    path("api/portfolio/<str:handle>/", project_views.portfolio, name="portfolio"),
    path("api/portfolio/<str:handle>/projects/<str:slug>/", project_views.portfolio_project, name="portfolio_project"),
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
    # Portfolio pages with link-preview tags (nginx routes /u/* here).
    re_path(r"^u/(?P<handle>[^/]+)/?$", meta.portfolio_page, name="portfolio_page"),
    re_path(r"^u/(?P<handle>[^/]+)/(?P<slug>[^/]+)/?$", meta.project_page, name="project_page"),
    path("api/swagger/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    path("api/redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
