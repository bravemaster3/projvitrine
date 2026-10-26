from unittest import mock

import pytest
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

from backend.models import Profile
from projects.models import Comment, Project

pytestmark = pytest.mark.django_db


def test_public_endpoints_never_include_email(client, make_user):
    alice = make_user("alice", email="alice@secret.test")
    project = Project.objects.create(
        user=alice, projectTitle="P", authors="alice", description="d", tags="x",
        githubRepos="https://github.com/alice/p", imgFile="project_images/p.png",
    )
    project.users.add(alice)
    Comment.objects.create(project=project, user=alice, content="hi")

    for url in [
        "/api/users",
        f"/api/users/{alice.id}",
        "/api/users/github/alice/",
        "/api/users_with_profiles/",
        "/api/projects/",
        f"/api/projects/{project.id}/",
        "/api/projects/user/alice/",
        f"/api/projects/{project.id}/comments/",
    ]:
        response = client.get(url)
        assert response.status_code == 200, url
        assert "alice@secret.test" not in response.content.decode(), url
        assert '"email"' not in response.content.decode(), url


def test_user_without_profile_is_listed(client, db):
    User.objects.create(username="ghost")
    response = client.get("/api/users")
    assert response.status_code == 200
    assert response.json()[0]["full_name"] == ""


def test_lookup_by_username_is_case_insensitive(client, make_user):
    make_user("bravemaster3")
    assert client.get("/api/users/github/BraveMaster3/").json()["username"] == "bravemaster3"


def test_update_profile_requires_login(client):
    assert client.put("/api/users/update/", {"bio": "x"}, format="json").status_code == 401


def test_update_profile_returns_own_email_and_marks_updated(auth_client, make_user):
    alice = make_user("alice", email="alice@secret.test")
    response = auth_client(alice).put(
        "/api/users/update/", {"bio": "New bio", "twitter": "", "location": "Sweden"}, format="json"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "alice@secret.test"
    assert body["bio"] == "New bio"
    assert body["twitter"] is None
    profile = Profile.objects.get(user=alice)
    assert profile.updated is True
    assert profile.location == "Sweden"


def test_update_profile_cannot_change_avatar_or_username(auth_client, make_user):
    alice = make_user("alice", avatar="https://avatars.example/a.png")
    payload = {"avatar": "https://evil.test/x.png", "username": "bob"}
    auth_client(alice).put("/api/users/update/", payload, format="json")
    alice.refresh_from_db()
    assert alice.username == "alice"
    assert alice.profile.avatar == "https://avatars.example/a.png"


def _github_mocks(login="Alice", name="Alice A", email="alice@gh.test"):
    token = mock.Mock(ok=True)
    token.json.return_value = {"access_token": "gho_secret"}
    user = mock.Mock(ok=True)
    user.json.return_value = {
        "login": login, "name": name, "avatar_url": "https://avatars/a.png", "location": "Togo", "bio": "Hi",
    }
    emails = mock.Mock(ok=True)
    emails.json.return_value = [{"email": "other@gh.test", "primary": False}, {"email": email, "primary": True}]
    return token, [user, emails]


def test_github_callback_creates_user_and_never_returns_github_token(client, db):
    token, gets = _github_mocks()
    with mock.patch("backend.views.requests.post", return_value=token), \
            mock.patch("backend.views.requests.get", side_effect=gets):
        response = client.get("/api/callback?code=abc")

    assert response.status_code == 200
    body = response.json()
    assert "github_token" not in body
    assert "gho_secret" not in response.content.decode()
    assert body["is_authenticated"] is True
    assert body["token"] and body["refresh"]
    assert body["username"] == "alice"
    assert body["email"] == "alice@gh.test"
    user = User.objects.get(username="alice")
    assert user.profile.location == "Togo"


def test_github_callback_keeps_manual_profile_edits(client, make_user):
    make_user("alice", full_name="My Own Name", location="Sweden", updated=True)
    token, gets = _github_mocks()
    with mock.patch("backend.views.requests.post", return_value=token), \
            mock.patch("backend.views.requests.get", side_effect=gets):
        body = client.get("/api/callback?code=abc").json()
    assert body["full_name"] == "My Own Name"
    assert body["location"] == "Sweden"
    assert body["avatar"] == "https://avatars/a.png"


def test_github_callback_rejects_missing_or_bad_code(client, db):
    assert client.get("/api/callback").status_code == 400
    bad = mock.Mock(ok=True)
    bad.json.return_value = {"error": "bad_verification_code"}
    with mock.patch("backend.views.requests.post", return_value=bad):
        assert client.get("/api/callback?code=nope").status_code == 400


def test_refresh_token_rotates(client, make_user):
    alice = make_user("alice")
    refresh = str(RefreshToken.for_user(alice))
    response = client.post("/api/token/refresh/", {"refresh": refresh}, format="json")
    assert response.status_code == 200
    assert response.json()["refresh"] != refresh
    # the old refresh token is blacklisted after rotation
    assert client.post("/api/token/refresh/", {"refresh": refresh}, format="json").status_code == 401


def test_signal_handlers_are_registered():
    from django.db.models.signals import post_save

    from backend.signals import save_user_profile

    # disconnect() returns True only if the handler was connected
    assert post_save.disconnect(save_user_profile, sender=User)
    post_save.connect(save_user_profile, sender=User)
