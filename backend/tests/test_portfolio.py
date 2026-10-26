from unittest import mock

import pytest

from backend.models import Community, Membership, ProfileTranslation
from projects.models import CoauthorInvite, Comment, Project, ProjectLink

from .conftest import make_image
from .test_users import _github_mocks

pytestmark = pytest.mark.django_db


def new_project(owner, title="HuHoLa", **extra):
    project = Project.objects.create(
        user=owner, projectTitle=title, authors=owner.username, description="d", tags="Python",
        githubRepos="https://github.com/x/y", imgFile="project_images/p.png", **extra,
    )
    project.users.add(owner)
    return project


# --- profiles -------------------------------------------------------------------

def test_handle_defaults_to_username(make_user):
    assert make_user("BraveMaster3").profile.handle == "bravemaster3"


def test_profile_update_portfolio_fields_and_translations(auth_client, make_user):
    alice = make_user("alice")
    api = auth_client(alice)
    response = api.put("/api/users/update/", {
        "handle": "Alice-K",
        "headline": "Geospatial developer",
        "orcid": "0000-0002-1825-0097",
        "open_to_work": True,
        "translations": {"fr": {"headline": "Développeuse géospatiale", "bio": "Bonjour"}},
    }, format="json")
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["handle"] == "alice-k"
    assert body["open_to_work"] is True
    assert body["translations"] == {"fr": {"headline": "Développeuse géospatiale", "bio": "Bonjour"}}

    # empty translation removes it
    api.put("/api/users/update/", {"translations": {"fr": {"headline": "", "bio": ""}}}, format="json")
    assert not ProfileTranslation.objects.exists()


@pytest.mark.parametrize("payload, field", [
    ({"handle": "admin"}, "handle"),
    ({"handle": "-bad-"}, "handle"),
    ({"orcid": "1234"}, "orcid"),
    ({"default_lang": "xx"}, "default_lang"),
    ({"translations": {"xx": {"bio": "?"}}}, "translations"),
    ({"translations": {"fr": {"nope": "?"}}}, "translations"),
])
def test_profile_update_rejects_invalid_values(auth_client, make_user, payload, field):
    response = auth_client(make_user("alice")).put("/api/users/update/", payload, format="json")
    assert response.status_code == 400
    assert field in response.json()


def test_handles_are_unique_case_insensitively(auth_client, make_user):
    make_user("taken")
    response = auth_client(make_user("alice")).put("/api/users/update/", {"handle": "TAKEN"}, format="json")
    assert response.status_code == 400


def test_memberships_can_be_set(auth_client, make_user):
    Community.objects.create(name="ALX", slug="alx")
    alice = make_user("alice")
    response = auth_client(alice).put(
        "/api/users/update/", {"memberships": [{"community": "alx", "label": "Cohort 16"}]}, format="json"
    )
    assert response.status_code == 200
    assert response.json()["memberships"][0]["community_name"] == "ALX"


# --- portfolio endpoints --------------------------------------------------------

def test_portfolio_by_handle_lists_featured_first(client, make_user):
    alice = make_user("alice")
    alice.profile.handle = "ak"
    alice.profile.save()
    new_project(alice, "Old", order=0)
    new_project(alice, "Star", featured=True, order=5)
    other = make_user("bob")
    shared = new_project(other, "Shared")
    shared.users.add(alice)

    for handle in ("ak", "AK", "alice"):  # handle, case-insensitive, or GitHub username
        body = client.get(f"/api/portfolio/{handle}/").json()
        assert body["user"]["username"] == "alice"
        assert [p["projectTitle"] for p in body["projects"]][0] == "Star"
        assert {p["projectTitle"] for p in body["projects"]} == {"Old", "Star", "Shared"}
        assert "email" not in str(body)


def test_portfolio_project_by_slug(client, make_user):
    alice = make_user("alice")
    project = new_project(alice, "My Great Tool")
    assert project.slug == "my-great-tool"
    response = client.get("/api/portfolio/alice/projects/my-great-tool/")
    assert response.status_code == 200
    assert response.json()["project"]["id"] == project.id
    assert client.get("/api/portfolio/alice/projects/nope/").status_code == 404
    assert client.get("/api/portfolio/nobody/").status_code == 404


def test_slugs_are_unique_per_owner_and_stable(make_user):
    alice, bob = make_user("alice"), make_user("bob")
    first = new_project(alice, "Tool")
    second = new_project(alice, "Tool")
    other = new_project(bob, "Tool")
    assert (first.slug, second.slug, other.slug) == ("tool", "tool-2", "tool")
    first.projectTitle = "Renamed"
    first.save()
    first.refresh_from_db()
    assert first.slug == "tool"


# --- links, translations, ordering ----------------------------------------------

def test_links_json_in_multipart_updates_legacy_fields(auth_client, make_user):
    owner = make_user("owner")
    api = auth_client(owner)
    response = api.post("/api/projects/", {
        "projectTitle": "T", "description": "d", "tags": "x", "githubRepos": "https://github.com/a/b",
        "imgFile": make_image(),
        "links": '[{"kind": "code", "url": "https://github.com/a/c"}, {"kind": "paper", "url": "https://doi.org/1"},'
                 ' {"kind": "live", "url": "https://c.example"}]',
    }, format="multipart")
    assert response.status_code == 201, response.content
    body = response.json()
    assert [link["kind"] for link in body["links"]] == ["code", "paper", "live"]
    assert body["githubRepos"] == "https://github.com/a/c"
    assert body["liveProject"] == "https://c.example"


def test_legacy_url_edit_updates_code_link(auth_client, make_user):
    owner = make_user("owner")
    project = new_project(owner)
    project.sync_primary_links()
    auth_client(owner).put(
        f"/api/projects/{project.id}/", {"githubRepos": "https://github.com/x/new", "liveProject": ""},
        format="multipart",
    )
    assert list(ProjectLink.objects.filter(project=project).values_list("kind", "url")) == [
        ("code", "https://github.com/x/new")
    ]


def test_project_translations(auth_client, make_user):
    owner = make_user("owner")
    project = new_project(owner)
    api = auth_client(owner)
    url = f"/api/projects/{project.id}/"
    response = api.patch(url, {"translations": {"sv": {"title": "HuHoLa", "summary": "Kartlägger"}}}, format="json")
    assert response.status_code == 200, response.content
    assert response.json()["translations"]["sv"]["summary"] == "Kartlägger"
    assert api.patch(url, {"translations": {"de": {"title": "x"}}}, format="json").status_code == 400


def test_period_must_be_ordered(auth_client, make_user):
    owner = make_user("owner")
    project = new_project(owner)
    response = auth_client(owner).patch(
        f"/api/projects/{project.id}/", {"period_start": "2024-05-01", "period_end": "2023-01-01"}, format="json"
    )
    assert response.status_code == 400


def test_reorder_only_own_projects(auth_client, make_user):
    owner, other = make_user("owner"), make_user("other")
    a, b = new_project(owner, "A"), new_project(owner, "B")
    foreign = new_project(other, "C")
    api = auth_client(owner)
    payload = [{"id": a.id, "order": 1}, {"id": b.id, "order": 0, "featured": True}]
    assert api.post("/api/projects/reorder/", payload, format="json").status_code == 204
    b.refresh_from_db()
    assert (b.order, b.featured) == (0, True)
    assert api.post("/api/projects/reorder/", [{"id": foreign.id, "order": 0}], format="json").status_code == 400


# --- invites --------------------------------------------------------------------

def test_invite_is_claimed_when_coauthor_logs_in(client, auth_client, make_user):
    owner = make_user("owner")
    project = new_project(owner)
    auth_client(owner).patch(f"/api/projects/{project.id}/", {"authors": "owner, NewFriend"}, format="json")
    assert CoauthorInvite.objects.get().status == "pending"
    # the invitee's portfolio lists the project even before they join
    assert [p["id"] for p in client.get("/api/projects/user/newfriend/").json()] == [project.id]

    token, gets = _github_mocks(login="NewFriend")
    with mock.patch("backend.views.requests.post", return_value=token), \
            mock.patch("backend.views.requests.get", side_effect=gets):
        assert client.get("/api/callback?code=abc").status_code == 200

    invite = CoauthorInvite.objects.get()
    assert invite.status == "accepted"
    assert invite.claimed_by.username == "newfriend"
    assert project.users.filter(username="newfriend").exists()


def test_removing_a_coauthor_drops_pending_invite(auth_client, make_user):
    owner = make_user("owner")
    project = new_project(owner)
    api = auth_client(owner)
    api.patch(f"/api/projects/{project.id}/", {"authors": "ghost"}, format="json")
    api.patch(f"/api/projects/{project.id}/", {"authors": ""}, format="json")
    assert not CoauthorInvite.objects.exists()


# --- comments moderation --------------------------------------------------------

def test_owner_can_hide_comments(client, auth_client, make_user):
    owner, fan = make_user("owner"), make_user("fan")
    project = new_project(owner)
    comment = Comment.objects.create(project=project, user=fan, content="spam")
    hide_url = f"/api/projects/{project.id}/comments/{comment.id}/hide/"

    assert auth_client(fan).post(hide_url).status_code == 403
    assert auth_client(owner).post(hide_url).json()["hidden"] is True

    assert client.get(f"/api/projects/{project.id}/").json()["comments"] == []
    assert client.get(f"/api/projects/{project.id}/comments/").json() == []
    assert len(auth_client(owner).get(f"/api/projects/{project.id}/comments/").json()) == 1

    assert auth_client(owner).post(hide_url).json()["hidden"] is False


# --- misc -----------------------------------------------------------------------

def test_communities_and_health(client, make_user):
    alx = Community.objects.create(name="ALX", slug="alx")
    Membership.objects.create(user=make_user("alice"), community=alx, label="Cohort 16")
    assert client.get("/api/communities/").json()[0]["member_count"] == 1
    detail = client.get("/api/communities/alx/").json()
    assert detail["members"][0]["username"] == "alice"
    assert client.get("/api/health/").json() == {"status": "ok"}
