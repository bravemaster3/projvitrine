"""Server-side link previews for portfolio and case-study URLs.

nginx sends /u/... to Django. We fetch the built index.html from the web
container, replace the title/description/Open Graph tags with the page's own,
and return it; the React app then takes over in the browser. Any failure
returns an error status, and nginx falls back to the plain index.html.
"""
import logging
import re
import time

import requests
from django.conf import settings
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.html import escape

from projects.models import Project

from .views import user_by_handle

logger = logging.getLogger(__name__)

_cache = {"html": None, "at": 0.0}
CACHE_SECONDS = 300
STRIP = re.compile(
    r"\s*(<title>.*?</title>|<meta\s+(?:name|property)=\"(?:description|og:[^\"]+|twitter:[^\"]+)\"[^>]*>"
    r"|<link\s+rel=\"(?:canonical|alternate)\"[^>]*>)",
    re.IGNORECASE | re.DOTALL,
)


class IndexUnavailable(Exception):
    pass


def index_html():
    now = time.monotonic()
    if _cache["html"] and now - _cache["at"] < CACHE_SECONDS:
        return _cache["html"]
    try:
        response = requests.get(settings.INDEX_HTML_URL, timeout=3)
        response.raise_for_status()
    except requests.RequestException as error:
        logger.warning("Could not fetch %s: %s", settings.INDEX_HTML_URL, error)
        raise IndexUnavailable from error
    _cache.update(html=response.text, at=now)
    return response.text


def absolute(url):
    if not url:
        return ""
    return url if url.startswith(("http://", "https://")) else f"{settings.SITE_URL}{url}"


def render(path, title, description, image, lang, kind="website"):
    url = f"{settings.SITE_URL}{path}"
    description = re.sub(r"\s+", " ", description or "").strip()[:300]
    tags = [
        f"<title>{escape(title)}</title>",
        f'<meta name="description" content="{escape(description)}">',
        f'<meta property="og:type" content="{kind}">',
        f'<meta property="og:site_name" content="{escape(settings.BRAND_NAME)}">',
        f'<meta property="og:title" content="{escape(title)}">',
        f'<meta property="og:description" content="{escape(description)}">',
        f'<meta property="og:url" content="{escape(url)}">',
        f'<meta property="og:locale" content="{escape(lang)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{escape(title)}">',
        f'<meta name="twitter:description" content="{escape(description)}">',
        f'<link rel="canonical" href="{escape(url)}">',
    ]
    if image:
        tags += [
            f'<meta property="og:image" content="{escape(absolute(image))}">',
            f'<meta name="twitter:image" content="{escape(absolute(image))}">',
        ]
    tags += [f'<link rel="alternate" hreflang="{code}" href="{escape(url)}?lang={code}">' for code in settings.LANGS]
    tags.append(f'<link rel="alternate" hreflang="x-default" href="{escape(url)}">')

    html = STRIP.sub("", index_html())
    html = re.sub(r"<html([^>]*)\blang=\"[^\"]*\"", rf'<html\1lang="{escape(lang)}"', html, count=1)
    html = html.replace("</head>", "    " + "\n    ".join(tags) + "\n  </head>", 1)
    response = HttpResponse(html)
    response["Cache-Control"] = "no-cache"
    return response


def _lang(request, default):
    lang = request.GET.get("lang")
    return lang if lang in settings.LANGS else (default if default in settings.LANGS else settings.DEFAULT_LANG)


def _profile_texts(profile, lang):
    translation = profile.translations.filter(lang=lang).first()
    headline = (translation and translation.headline) or profile.headline
    bio = (translation and translation.bio) or profile.bio or ""
    return headline, bio


def portfolio_page(request, handle):
    user = user_by_handle(handle)
    if not hasattr(user, "profile"):
        raise Http404
    profile = user.profile
    lang = _lang(request, profile.default_lang)
    headline, bio = _profile_texts(profile, lang)
    name = profile.full_name or user.username
    title = f"{name} · {headline}" if headline else name
    try:
        return render(f"/u/{profile.handle}", title, bio or headline, profile.avatar, lang, kind="profile")
    except IndexUnavailable:
        return HttpResponse(status=502)


def project_page(request, handle, slug):
    user = user_by_handle(handle)
    project = get_object_or_404(
        Project.objects.filter(users=user) | Project.objects.filter(user=user), slug=slug.lower()
    )
    owner_profile = getattr(user, "profile", None)
    lang = _lang(request, project.lang or (owner_profile and owner_profile.default_lang))
    translation = project.translations.filter(lang=lang).first()
    title = (translation and translation.title) or project.projectTitle
    summary = (translation and translation.summary) or project.description
    name = (owner_profile and owner_profile.full_name) or user.username
    cover = f"{settings.MEDIA_URL}{project.imgFile.name}" if project.imgFile else ""
    path = f"/u/{owner_profile.handle if owner_profile else user.username}/{project.slug}"
    try:
        return render(path, f"{title} · {name}", summary, cover, lang, kind="article")
    except IndexUnavailable:
        return HttpResponse(status=502)
