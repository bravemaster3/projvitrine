"""Settings for the test suite: in-memory SQLite and a throwaway media folder."""
import os
import tempfile

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256")
os.environ["DATABASE_URL"] = "sqlite://:memory:"

from .settings import *  # noqa: E402,F403

MEDIA_ROOT = tempfile.mkdtemp(prefix="proofolio-test-media-")
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
