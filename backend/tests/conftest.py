import io

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from backend.models import Profile


def make_image(name="cover.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), "teal").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


@pytest.fixture
def make_user(db):
    def _make(username, email=None, **profile):
        user = User.objects.create(username=username, email=email or f"{username}@example.com")
        Profile.objects.create(user=user, full_name=profile.pop("full_name", username.title()), **profile)
        return user

    return _make


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def auth_client():
    def _client(user):
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
        return api

    return _client
