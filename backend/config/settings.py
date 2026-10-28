"""Environment-based settings for the Solva API.

Local development uses SQLite and does not require Redis. PostgreSQL, Redis,
and Celery are configured when their environment variables are present.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


def env_list(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


DJANGO_ENV = os.environ.get("DJANGO_ENV", "development").strip().lower()
DEBUG = env_bool("DJANGO_DEBUG", DJANGO_ENV != "production")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DJANGO_ENV == "production":
        raise RuntimeError("DJANGO_SECRET_KEY is required when DJANGO_ENV=production.")
    SECRET_KEY = "dev-only-solva-secret-key-not-for-production"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"])
if DJANGO_ENV == "production" and not ALLOWED_HOSTS:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS is required when DJANGO_ENV=production.")

ON_VERCEL = bool(os.environ.get("VERCEL"))
if ON_VERCEL and ".vercel.app" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS = [*ALLOWED_HOSTS, ".vercel.app"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "apps.accounts",
    "apps.image_processing",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.image_processing.middleware.ApiErrorMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

AUTH_USER_MODEL = "accounts.User"

if os.environ.get("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["POSTGRES_DB"],
            "USER": os.environ.get("POSTGRES_USER", ""),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
            "CONN_MAX_AGE": env_int("POSTGRES_CONN_MAX_AGE", 60),
        }
    }
else:
    sqlite_path = Path("/tmp/solva.sqlite3") if ON_VERCEL else BASE_DIR / "db.sqlite3"
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": sqlite_path,
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

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
try:
    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
except OSError:
    pass
_STATICFILES_BACKEND = (
    "whitenoise.storage.CompressedStaticFilesStorage"
    if DJANGO_ENV == "production"
    else "django.contrib.staticfiles.storage.StaticFilesStorage"
)
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": _STATICFILES_BACKEND},
}

_default_media = Path("/tmp/solva-media") if ON_VERCEL else BASE_DIR / "media"
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", _default_media))
MEDIA_URL = "/media/"
if ON_VERCEL and not os.environ.get("U2NET_HOME"):
    os.environ["U2NET_HOME"] = "/tmp/u2net"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    ["http://localhost:5173", "http://127.0.0.1:5173"],
)
CORS_ALLOW_CREDENTIALS = False

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", [])
if ON_VERCEL:
    for origin in ("https://*.vercel.app",):
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)
    for host in (
        os.environ.get("VERCEL_PROJECT_PRODUCTION_URL", ""),
        os.environ.get("VERCEL_URL", ""),
    ):
        host = host.strip()
        if host:
            origin = f"https://{host}"
            if origin not in CSRF_TRUSTED_ORIGINS:
                CSRF_TRUSTED_ORIGINS.append(origin)

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

if DJANGO_ENV == "production":
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = env_int("DJANGO_HSTS_SECONDS", 0)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_HSTS_INCLUDE_SUBDOMAINS", False)
    SECURE_HSTS_PRELOAD = False
else:
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", False)

if env_bool("DJANGO_BEHIND_PROXY", False) or ON_VERCEL:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True

TRUST_PROXY_HEADERS = env_bool("TRUST_PROXY_HEADERS", False)

MAX_UPLOAD_BYTES = env_int("MAX_UPLOAD_BYTES", 10 * 1024 * 1024)
MAX_DIMENSION_PX = env_int("MAX_DIMENSION_PX", 4096)
MAX_IMAGE_PIXELS = env_int("MAX_IMAGE_PIXELS", 16_000_000)
IMAGE_RETENTION_MINUTES = env_int("IMAGE_RETENTION_MINUTES", 30)
PROCESSING_TIMEOUT_SECONDS = env_int("PROCESSING_TIMEOUT_SECONDS", 120)
SUPPORTED_IMAGE_FORMATS = ("PNG", "JPEG", "WEBP")

DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_BYTES + (1 * 1024 * 1024)
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_BYTES
DATA_UPLOAD_MAX_NUMBER_FIELDS = 20

AI_PROVIDER = os.environ.get("AI_PROVIDER", "rembg").strip().lower() or "rembg"
REMBG_MODEL = os.environ.get("REMBG_MODEL", "u2net").strip() or "u2net"
AI_HTTP_ENDPOINT = os.environ.get("AI_HTTP_ENDPOINT", "").strip()
AI_HTTP_API_KEY = os.environ.get("AI_HTTP_API_KEY", "").strip()
AI_HTTP_TIMEOUT_SECONDS = env_int("AI_HTTP_TIMEOUT_SECONDS", 60)

CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "").strip()

DISABLE_THROTTLING = env_bool("DISABLE_THROTTLING", False)
BACKGROUND_REMOVAL_THROTTLE = os.environ.get("BACKGROUND_REMOVAL_THROTTLE", "10/minute")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.image_processing.exceptions.api_exception_handler",
    # `format` is the PNG/JPEG option on downloads. Leaving DRF's override on
    # makes `?format=jpeg` look like a missing renderer and return 404.
    "URL_FORMAT_OVERRIDE": None,
    "DEFAULT_THROTTLE_RATES": {
        "background_removal": BACKGROUND_REMOVAL_THROTTLE,
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Solva API",
    "DESCRIPTION": "Background removal API. Uploads are anonymous and temporary.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_TASK_IGNORE_RESULT = True
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CLEANUP_INTERVAL_SECONDS = env_int("CLEANUP_INTERVAL_SECONDS", 600)

if CELERY_BROKER_URL:
    CELERY_BEAT_SCHEDULE = {
        "cleanup-expired-results": {
            "task": "apps.image_processing.tasks.cleanup_expired_results",
            "schedule": CLEANUP_INTERVAL_SECONDS,
        }
    }

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "plain",
        }
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.server": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps.image_processing": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
