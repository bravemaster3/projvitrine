import logging

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile
from .serializers import PublicUserSerializer, UserSerializer

logger = logging.getLogger(__name__)

GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API = "https://api.github.com"
GITHUB_TIMEOUT = 10


def _users():
    return User.objects.select_related("profile").order_by("id")


@api_view(["GET"])
def all_users(request):
    """Public list of users (no emails)."""
    return Response(PublicUserSerializer(_users(), many=True).data)


@api_view(["GET"])
def get_user(request, user_id):
    """Public info for one user (no email)."""
    user = get_object_or_404(_users(), pk=user_id)
    return Response(PublicUserSerializer(user).data)


@api_view(["GET"])
def get_user_by_github_username(request, github_username):
    """Public info for one user by GitHub username (no email)."""
    user = get_object_or_404(_users(), username=github_username.lower())
    return Response(PublicUserSerializer(user).data)


@api_view(["GET"])
def get_all_users_with_profiles(request):
    """Name, username and country of every user with a profile, for the map."""
    users = _users().filter(profile__isnull=False)
    return Response(
        [
            {
                "full_name": user.profile.full_name,
                "github_username": user.username,
                "country": user.profile.location,
            }
            for user in users
        ]
    )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Read (GET) or update (PUT) the signed-in user's own account and profile."""
    user = request.user
    get_object_or_404(Profile, user=user)
    if request.method == "GET":
        return Response(UserSerializer(user).data)

    serializer = UserSerializer(user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


def _github_get(path, token):
    return requests.get(
        f"{GITHUB_API}{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        timeout=GITHUB_TIMEOUT,
    )


@api_view(["GET"])
def github_callback(request):
    """Exchange a GitHub OAuth code for our own JWTs.

    The GitHub access token is used here only to read the user's public profile
    and primary email; it is never sent to the browser or stored.
    """
    code = request.GET.get("code")
    if not code:
        return Response(
            {"is_authenticated": False, "error": "Missing code"}, status=status.HTTP_400_BAD_REQUEST
        )

    failure = Response(
        {"is_authenticated": False, "error": "Authentication failed"}, status=status.HTTP_400_BAD_REQUEST
    )
    try:
        token_response = requests.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
            timeout=GITHUB_TIMEOUT,
        )
        access_token = token_response.json().get("access_token") if token_response.ok else None
        if not access_token:
            return failure

        user_response = _github_get("/user", access_token)
        if not user_response.ok:
            return failure
        gh = user_response.json()

        primary_email = ""
        email_response = _github_get("/user/emails", access_token)
        if email_response.ok:
            primary_email = next((e["email"] for e in email_response.json() if e.get("primary")), "") or ""
    except requests.RequestException:
        logger.exception("GitHub OAuth request failed")
        return failure

    with transaction.atomic():
        user, _ = User.objects.get_or_create(username=gh["login"].lower())
        profile, _ = Profile.objects.get_or_create(user=user)
        # The avatar always follows GitHub; other fields only until the user edits them.
        profile.avatar = gh.get("avatar_url")
        if not profile.updated:
            profile.full_name = gh.get("name") or ""
            profile.location = gh.get("location") or ""
            profile.bio = gh.get("bio") or ""
            user.email = primary_email
            user.save(update_fields=["email"])
        profile.save()

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "is_authenticated": True,
            "token": str(refresh.access_token),
            "refresh": str(refresh),
            **UserSerializer(user).data,
        }
    )
