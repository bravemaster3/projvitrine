from unittest import mock

import pytest

from backend import meta
from backend.models import ProfileTranslation
from projects.models import Project

pytestmark = pytest.mark.django_db

INDEX = """<!doctype html>
<html lang="en">
  <head>
    <title>Showcase</title>
    <meta name="description" content="generic">
    <meta property="og:title" content="Showcase">
  </head>
  <body><div id="root"></div></body>
</html>"""


@pytest.fixture(autouse=True)
def index(settings):
    settings.SITE_URL = "https://folio.example"
    meta._cache.update(html=None, at=0)
    response = mock.Mock(text=INDEX)
    response.raise_for_status.return_value = None
    with mock.patch("backend.meta.requests.get", return_value=response) as get:
        yield get


def test_portfolio_preview_tags(client, make_user):
    user = make_user("bravemaster3", full_name="Koffi Dodji Noumonvi", avatar="https://avatars.example/k.png")
    user.profile.headline = "Geospatial developer"
    user.profile.bio = 'Builds <tools> & "maps"'
    user.profile.save()
    html = client.get("/u/BraveMaster3").content.decode()
    assert "<title>Koffi Dodji Noumonvi · Geospatial developer</title>" in html
    assert html.count("<title>") == 1 and "generic" not in html
    assert 'content="Builds &lt;tools&gt; &amp; &quot;maps&quot;"' in html
    assert '<meta property="og:image" content="https://avatars.example/k.png">' in html
    assert '<link rel="canonical" href="https://folio.example/u/bravemaster3">' in html
    assert 'hreflang="fr" href="https://folio.example/u/bravemaster3?lang=fr"' in html
    assert '<div id="root"></div>' in html


def test_portfolio_preview_in_requested_language(client, make_user):
    user = make_user("alice")
    user.profile.headline = "Developer"
    user.profile.save()
    ProfileTranslation.objects.create(profile=user.profile, lang="fr", headline="Développeuse")
    html = client.get("/u/alice/?lang=fr").content.decode()
    assert "Développeuse" in html and '<html lang="fr"' in html


def test_project_preview_uses_cover(client, make_user):
    owner = make_user("owner", full_name="Owner Name")
    project = Project.objects.create(
        user=owner, projectTitle="HuHoLa", authors="owner", description="Maps mires", tags="x",
        githubRepos="https://github.com/o/h", imgFile="project_images/HuHoLa.JPG",
    )
    project.users.add(owner)
    html = client.get("/u/owner/huhola").content.decode()
    assert "<title>HuHoLa · Owner Name</title>" in html
    assert 'content="https://folio.example/media/project_images/HuHoLa.JPG"' in html
    assert '<meta property="og:type" content="article">' in html


def test_unknown_pages_404_so_nginx_serves_the_app(client, make_user):
    make_user("owner")
    assert client.get("/u/nobody").status_code == 404
    assert client.get("/u/owner/nothing").status_code == 404


def test_index_unavailable_returns_502(client, make_user, index):
    make_user("owner")
    index.side_effect = meta.requests.ConnectionError("down")
    assert client.get("/u/owner").status_code == 502


def test_index_is_cached(client, make_user, index):
    make_user("owner")
    client.get("/u/owner")
    client.get("/u/owner")
    assert index.call_count == 1
