import pytest
from django.contrib.auth.models import User
from django.core.files.storage import default_storage

from projects.models import Comment, Project

from .conftest import make_image

pytestmark = pytest.mark.django_db


def project_payload(**overrides):
    payload = {
        "projectTitle": "HuHoLa",
        "authors": "",
        "description": "Maps mire microtopography",
        "tags": "Python, Peatlands",
        "githubRepos": "https://github.com/bravemaster3/huhola",
        "liveProject": "",
        "imgFile": make_image(),
    }
    payload.update(overrides)
    return payload


def create_project(api):
    response = api.post("/api/projects/create_with_token/", project_payload(authors="pesho2k"), format="multipart")
    assert response.status_code == 201, response.content
    return response.json()


def test_anonymous_cannot_create(client):
    assert client.post("/api/projects/", project_payload(), format="multipart").status_code == 401


def test_create_puts_owner_first_and_invites_unknown_coauthors(auth_client, make_user):
    owner = make_user("bravemaster3")
    body = create_project(auth_client(owner))
    assert body["authors"] == "bravemaster3, pesho2k"
    assert [u["username"] for u in body["users"]] == ["bravemaster3"]
    assert body["invites"] == [{"github_username": "pesho2k", "status": "pending"}]
    assert not User.objects.filter(username="pesho2k").exists()  # no placeholder account
    assert body["user"]["username"] == "bravemaster3"
    assert body["imgFile"].startswith("/media/project_images/")
    assert body["slug"] == "huhola"
    assert [link["kind"] for link in body["links"]] == ["code"]


def test_existing_users_are_linked_directly(auth_client, make_user):
    owner, friend = make_user("owner"), make_user("friend")
    response = auth_client(owner).post("/api/projects/", project_payload(authors="@Friend"), format="multipart")
    assert [u["username"] for u in response.json()["users"]] == ["owner", "friend"]
    assert response.json()["invites"] == []
    assert friend.projects.count() == 1


def test_plain_post_works_like_create_with_token(auth_client, make_user):
    owner = make_user("owner")
    response = auth_client(owner).post("/api/projects/", project_payload(), format="multipart")
    assert response.status_code == 201


def test_update_without_new_image_keeps_image(auth_client, make_user):
    """Regression: the old update() crashed or dropped the image when none was uploaded."""
    owner = make_user("owner")
    api = auth_client(owner)
    created = create_project(api)
    # The current frontend sends imgFile=null as the string "null".
    response = api.put(
        f"/api/projects/{created['id']}/",
        {"projectTitle": "Renamed", "authors": "pesho2k", "imgFile": "null"},
        format="multipart",
    )
    assert response.status_code == 200, response.content
    assert response.json()["projectTitle"] == "Renamed"
    assert response.json()["imgFile"] == created["imgFile"]


def test_update_with_new_image_deletes_old_file(auth_client, make_user, django_capture_on_commit_callbacks):
    owner = make_user("owner")
    api = auth_client(owner)
    created = create_project(api)
    old_name = Project.objects.get(pk=created["id"]).imgFile.name
    assert default_storage.exists(old_name)

    with django_capture_on_commit_callbacks(execute=True):
        response = api.put(f"/api/projects/{created['id']}/", {"imgFile": make_image("new.png")}, format="multipart")
    assert response.status_code == 200
    new_name = Project.objects.get(pk=created["id"]).imgFile.name
    assert new_name != old_name
    assert default_storage.exists(new_name)
    assert not default_storage.exists(old_name)


def test_only_owner_can_edit_or_delete(auth_client, make_user):
    owner, other = make_user("owner"), make_user("other")
    created = create_project(auth_client(owner))
    url = f"/api/projects/{created['id']}/"
    assert auth_client(other).put(url, {"projectTitle": "x"}, format="multipart").status_code == 403
    assert auth_client(other).delete(url).status_code == 403


def test_delete_removes_image(auth_client, make_user):
    owner = make_user("owner")
    api = auth_client(owner)
    created = create_project(api)
    name = Project.objects.get(pk=created["id"]).imgFile.name
    assert api.delete(f"/api/projects/{created['id']}/").status_code == 204
    assert not Project.objects.filter(pk=created["id"]).exists()
    assert not default_storage.exists(name)


def test_likes_toggle_and_are_not_writable(auth_client, make_user):
    owner, fan = make_user("owner"), make_user("fan")
    created = create_project(auth_client(owner))
    like_url = f"/api/projects/{created['id']}/like/"
    assert auth_client(fan).post(like_url).json()["likes_count"] == 1
    assert auth_client(fan).post(like_url).json()["likes_count"] == 0

    auth_client(owner).put(f"/api/projects/{created['id']}/", {"likes": [fan.id]}, format="multipart")
    assert Project.objects.get(pk=created["id"]).likes.count() == 0


def test_user_projects_includes_coauthored(client, auth_client, make_user):
    owner = make_user("owner")
    create_project(auth_client(owner))
    titles = [p["projectTitle"] for p in client.get("/api/projects/user/PESHO2K/").json()]
    assert titles == ["HuHoLa"]


def test_comment_permissions(client, auth_client, make_user):
    owner, author, stranger = make_user("owner"), make_user("author"), make_user("stranger")
    created = create_project(auth_client(owner))
    base = f"/api/projects/{created['id']}/comments/"

    assert client.post(base, {"content": "anon"}, format="json").status_code == 401
    comment = auth_client(author).post(base, {"content": "Nice!"}, format="json").json()
    url = f"{base}{comment['id']}/"

    assert auth_client(stranger).patch(url, {"content": "hacked"}, format="json").status_code == 403
    assert auth_client(stranger).delete(url).status_code == 403
    assert auth_client(owner).patch(url, {"content": "edited by owner"}, format="json").status_code == 403
    assert auth_client(author).patch(url, {"content": "Nicer!"}, format="json").status_code == 200
    assert auth_client(owner).delete(url).status_code == 204
    assert not Comment.objects.exists()
