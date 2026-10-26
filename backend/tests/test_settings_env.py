"""The original droplet .env must work unchanged on Coolify (blank optional fields included)."""
import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

PROBE = """
import json
from backend import settings as s
print(json.dumps({
    "debug": s.DEBUG, "site": s.SITE_URL, "hosts": s.ALLOWED_HOSTS, "csrf": s.CSRF_TRUSTED_ORIGINS,
    "db": {k: s.DATABASES["default"][k] for k in ("ENGINE", "NAME", "HOST", "PORT")},
    "github": [s.GITHUB_CLIENT_ID, bool(s.GITHUB_CLIENT_SECRET)], "langs": s.LANGS,
    "access_minutes": s.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].seconds // 60,
    "jwt_key_is_custom": s.SIMPLE_JWT["SIGNING_KEY"] == "jwt-key",
}))
"""


def load_settings(env):
    clean = {k: v for k, v in os.environ.items() if not k.isupper() or k in ("PATH", "SYSTEMROOT", "TEMP", "TMP")}
    result = subprocess.run(
        [sys.executable, "-c", PROBE], cwd=BACKEND_DIR, env={**clean, **env},
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def test_original_droplet_env_with_blank_coolify_fields():
    settings = load_settings({
        # names and quoting exactly as in the droplet's .env
        "NODE_ENV": "production",
        "VITE_BACKEND_URL": '"http://alxhof.kndev.org"',
        "VITE_FRONTEND_URL": '"http://alxhof.kndev.org"',
        "VITE_GITHUB_CLIENT_ID": "abc123",
        "SECRET_KEY": "'s3cret'",
        "SOCIAL_AUTH_GITHUB_KEY": "abc123",
        "SOCIAL_AUTH_GITHUB_SECRET": "shh",
        "JWT_SIGNING_KEY": "jwt-key",
        "DEBUG": "False",
        "SITE_DOMAIN": "'http://alxhof.kndev.org'",
        "DB_NAME": "alxhof_db", "DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "'db'", "DB_PORT": "'5432'",
        # optional fields left blank in the Coolify UI
        "ALLOWED_HOSTS": "", "CSRF_TRUSTED_ORIGINS": "", "JWT_ACCESS_MINUTES": "", "LANGS": "", "DATABASE_URL": "",
    })
    assert settings["debug"] is False
    assert settings["site"] == "http://alxhof.kndev.org"
    assert "alxhof.kndev.org" in settings["hosts"] and "backend" in settings["hosts"]
    assert "https://alxhof.kndev.org" in settings["csrf"]
    assert settings["db"] == {
        "ENGINE": "django.db.backends.postgresql", "NAME": "alxhof_db", "HOST": "db", "PORT": "5432",
    }
    assert settings["github"] == ["abc123", True]
    assert settings["langs"] == ["en", "fr", "sv"]
    assert settings["access_minutes"] == 30
    assert settings["jwt_key_is_custom"] is True


def test_new_names_take_precedence():
    settings = load_settings({
        "SECRET_KEY": "x", "SITE_URL": "https://folio.example", "SITE_DOMAIN": "http://old.example",
        "ALLOWED_HOSTS": "folio.example,old.example", "DATABASE_URL": "postgres://a:b@pg:5433/showcase",
        "GITHUB_CLIENT_ID": "new", "SOCIAL_AUTH_GITHUB_KEY": "old", "LANGS": "en,fr",
    })
    assert settings["site"] == "https://folio.example"
    assert settings["hosts"] == ["folio.example", "old.example"]
    assert settings["db"]["HOST"] == "pg" and settings["db"]["PORT"] == 5433
    assert settings["github"][0] == "new"
    assert settings["langs"] == ["en", "fr"]
