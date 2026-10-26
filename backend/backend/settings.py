"""
Django settings.

Every deployment-specific value comes from the environment (or a `.env` file at
the repository root). See `.env.example` for the full list.
"""
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

env = environ.Env()
if (REPO_ROOT / ".env").exists():
    environ.Env.read_env(REPO_ROOT / ".env")


def env_str(name, default=""):
    """Environment string; blank (as platforms like Coolify pass unset fields) means default.
    Surrounding quotes pasted from an old .env file are removed."""
    value = (env(name, default="") or "").strip().strip("'\"").strip()
    return value or default


def env_list(name, default):
    value = env_str(name)
    return [item.strip() for item in value.split(",") if item.strip()] if value else list(default)


def env_int(name, default):
    value = env_str(name)
    return int(value) if value else default


def env_bool(name, default):
    value = env_str(name).lower()
    return value in ("1", "true", "yes", "on") if value else default

DEBUG = env_bool("DEBUG", False)

SECRET_KEY = env_str("SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("SECRET_KEY must be set when DEBUG is false.")
    SECRET_KEY = "dev-only-insecure-secret-key"

# Public URL of the site, used for links, meta tags and host defaults.
# SITE_DOMAIN and VITE_FRONTEND_URL are the names used by the original deployment.
SITE_URL = (
    env_str("SITE_URL") or env_str("SITE_DOMAIN") or env_str("VITE_FRONTEND_URL") or "http://localhost:5173"
).rstrip("/")

# Languages content can be written and translated in (first = default).
LANGS = env_list("LANGS", env_list("VITE_LANGS", ["en", "fr", "sv"]))
DEFAULT_LANG = env_str("DEFAULT_LANG", env_str("VITE_DEFAULT_LANG", LANGS[0]))

_site_host = urlparse(SITE_URL).hostname or "localhost"
# "backend" is the service name other containers use to reach Django.
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", sorted({_site_host, "localhost", "127.0.0.1", "backend"}))
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", [f"https://{_site_host}", f"http://{_site_host}"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "drf_yasg",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "backend",
    "projects",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# Database: DATABASE_URL wins; otherwise the DB_* variables used by the current
# deployment; otherwise a local SQLite file for development.
if env_str("DATABASE_URL"):
    DATABASES = {"default": env.db_url_config(env_str("DATABASE_URL"))}
elif env_str("DB_NAME"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env_str("DB_NAME"),
            "USER": env_str("DB_USER"),
            "PASSWORD": env_str("DB_PASSWORD"),
            "HOST": env_str("DB_HOST", "localhost"),
            "PORT": env_str("DB_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Behind a TLS-terminating proxy (nginx today, Coolify/Traefik later).
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = env_bool("USE_X_FORWARDED_HOST", False)
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = env_bool("SECURE_COOKIES", not DEBUG)
# HTTPS redirect and HSTS are handled by the reverse proxy.

# --- API & auth ---------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_MINUTES", 30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_DAYS", 14)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env_str("JWT_SIGNING_KEY", SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

SWAGGER_USE_COMPAT_RENDERERS = False
SWAGGER_SETTINGS = {
    "SECURITY_DEFINITIONS": {
        "Bearer": {"type": "apiKey", "name": "Authorization", "in": "header"}
    }
}

# GitHub OAuth app. The SOCIAL_AUTH_* names are accepted for the existing deployment.
GITHUB_CLIENT_ID = env_str("GITHUB_CLIENT_ID", env_str("SOCIAL_AUTH_GITHUB_KEY"))
GITHUB_CLIENT_SECRET = env_str("GITHUB_CLIENT_SECRET", env_str("SOCIAL_AUTH_GITHUB_SECRET"))

# Same-origin in production; list extra origins (e.g. the Vite dev server) here.
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", ["http://localhost:5173", "http://127.0.0.1:5173"] if DEBUG else []
)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": env_str("LOG_LEVEL", "INFO")},
}
