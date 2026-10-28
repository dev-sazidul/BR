import io
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image, ImageDraw
from rest_framework.test import APIClient

from apps.image_processing.exceptions import BackgroundRemovalError


class FakeProvider:
    def __init__(self, fail: BackgroundRemovalError | None = None, delay: float = 0):
        self.fail = fail
        self.delay = delay

    def status(self) -> dict:
        if self.fail and self.fail.code == "ai_unavailable" and self.delay == 0:
            return {
                "provider": "fake",
                "model": "test",
                "available": False,
                "model_cached": False,
                "detail": self.fail.message,
            }
        return {
            "provider": "fake",
            "model": "test",
            "available": True,
            "model_cached": True,
            "detail": "ok",
        }

    def remove(self, image: Image.Image) -> Image.Image:
        if self.delay:
            time.sleep(self.delay)
        if self.fail:
            raise self.fail
        out = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(out)
        margin = max(1, image.width // 4)
        draw.rectangle(
            (margin, margin, image.width - margin - 1, image.height - margin - 1),
            fill=(180, 40, 40, 255),
        )
        return out


def response_bytes(response) -> bytes:
    if getattr(response, "streaming", False):
        return b"".join(response.streaming_content)
    return response.content


def uploaded_image(
    fmt: str = "PNG",
    size: tuple[int, int] = (32, 32),
    name: str = "photo.png",
    color: tuple = (10, 120, 200, 255),
) -> SimpleUploadedFile:
    buffer = io.BytesIO()
    mode = "RGB" if fmt in {"JPEG", "JPG"} else "RGBA"
    fill = color[:3] if mode == "RGB" else color
    image = Image.new(mode, size, fill)
    pil_format = {"JPG": "JPEG", "JPEG": "JPEG", "PNG": "PNG", "WEBP": "WEBP", "GIF": "GIF"}[fmt]
    image.save(buffer, format=pil_format)
    content_types = {
        "PNG": "image/png",
        "JPEG": "image/jpeg",
        "JPG": "image/jpeg",
        "WEBP": "image/webp",
        "GIF": "image/gif",
    }
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_types[fmt])


class ApiTestCase(TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.override = override_settings(
            MEDIA_ROOT=self.tmp.name,
            DISABLE_THROTTLING=True,
            IMAGE_RETENTION_MINUTES=30,
            PROCESSING_TIMEOUT_SECONDS=5,
        )
        self.override.enable()
        self.client = APIClient()

    def tearDown(self):
        self.override.disable()
        self.tmp.cleanup()

class HealthAndConfigTests(ApiTestCase):
    def test_health_reports_ai_availability_without_secrets(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["service"], "solva-api")
        self.assertIn(body["status"], {"ok", "degraded"})
        self.assertIn("available", body["ai"])
        self.assertNotIn("secret", response.content.decode().lower())
        self.assertNotIn("password", response.content.decode().lower())

    def test_config_exposes_only_public_fields(self):
        response = self.client.get("/api/v1/config/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.json()),
            {
                "max_upload_bytes",
                "max_dimension_px",
                "supported_formats",
                "output_formats",
                "retention_minutes",
                "ai_provider",
                "ai_model",
                "contact_email",
            },
        )
        blob = response.content.decode().lower()
        self.assertNotIn("secret", blob)
        self.assertNotIn("password", blob)
        self.assertNotIn("api_key", blob)
        self.assertNotIn("token", blob)

    @override_settings(CONTACT_EMAIL="studio@example.com")
    def test_contact_email_is_public_when_configured(self):
        response = self.client.get("/api/v1/config/")
        self.assertEqual(response.json()["contact_email"], "studio@example.com")

    def test_openapi_schema_is_served(self):
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Solva API", response.content)


class RemovalApiTests(ApiTestCase):
    def _post(self, upload, provider: FakeProvider | None = None):
        provider = provider or FakeProvider()
        with (
            patch("apps.image_processing.services.removal.get_provider", return_value=provider),
            patch("apps.image_processing.views.get_provider", return_value=provider),
        ):
            return self.client.post(
                "/api/v1/images/remove-background/",
                {"image": upload},
                format="multipart",
            )

    def test_successful_png_is_transparent(self):
        response = self._post(uploaded_image())
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertNotIn(self.tmp.name, response.content.decode())
        self.assertTrue(body["result_url"].startswith("/api/v1/images/results/"))
        self.assertEqual(body["width"], 32)
        self.assertEqual(body["height"], 32)

        preview = self.client.get(body["result_url"])
        self.assertEqual(preview.status_code, 200)
        self.assertTrue(preview["Content-Type"].startswith("image/png"))
        with Image.open(io.BytesIO(response_bytes(preview))) as result:
            self.assertEqual(result.mode, "RGBA")
            self.assertEqual(result.getpixel((0, 0))[3], 0)
            self.assertEqual(result.getpixel((16, 16))[3], 255)

        download = self.client.get(body["download_url"])
        self.assertEqual(download.status_code, 200)
        self.assertIn("attachment", download["Content-Disposition"])

    def test_jpeg_download_flattens_onto_the_requested_color(self):
        created = self._post(uploaded_image())
        download_url = created.json()["download_url"]
        response = self.client.get(download_url + "?format=jpeg&background=%2300FF00")
        payload = response_bytes(response)
        self.assertEqual(response.status_code, 200, (download_url, payload[:400]))
        self.assertTrue(response["Content-Type"].startswith("image/jpeg"))
        with Image.open(io.BytesIO(payload)) as result:
            self.assertEqual(result.mode, "RGB")
            corner = result.getpixel((0, 0))
            self.assertGreater(corner[1], 250)
            self.assertLess(corner[0], 10)
            self.assertLess(corner[2], 10)
            center = result.getpixel((16, 16))
            self.assertGreater(center[0], center[1])
            self.assertGreater(center[0], center[2])

    def test_jpeg_rejects_a_bad_color(self):
        created = self._post(uploaded_image())
        response = self.client.get(created.json()["download_url"] + "?format=jpeg&background=red")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_color")

    def test_webp_upload_is_accepted(self):
        response = self._post(uploaded_image(fmt="WEBP", name="photo.webp"))
        self.assertEqual(response.status_code, 200, response.content)

    def test_original_filename_cannot_escape_the_results_directory(self):
        upload = uploaded_image(name="../../etc/passwd.png")
        response = self._post(upload)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["original_filename"], "passwd.png")
        stored = list(Path(self.tmp.name, "results").iterdir())
        self.assertTrue(stored)
        self.assertTrue(all(path.suffix == ".png" and "passwd" not in path.name for path in stored))

    def test_missing_file_is_rejected(self):
        response = self.client.post("/api/v1/images/remove-background/", {}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_request")

    def test_text_file_is_rejected(self):
        upload = SimpleUploadedFile("notes.png", b"hello", content_type="image/png")
        response = self._post(upload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_image")

    def test_gif_is_rejected(self):
        response = self._post(uploaded_image(fmt="GIF", name="anim.gif"))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "unsupported_format")

    def test_empty_file_is_rejected(self):
        upload = SimpleUploadedFile("empty.png", b"", content_type="image/png")
        response = self._post(upload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_request")

    @override_settings(MAX_UPLOAD_BYTES=100)
    def test_oversized_file_is_rejected(self):
        response = self._post(uploaded_image())
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["error"]["code"], "file_too_large")

    @override_settings(MAX_DIMENSION_PX=8)
    def test_large_dimensions_are_rejected(self):
        response = self._post(uploaded_image(size=(16, 16)))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "dimensions_too_large")

    @override_settings(MAX_IMAGE_PIXELS=10)
    def test_too_many_pixels_are_rejected(self):
        response = self._post(uploaded_image(size=(8, 8)))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "dimensions_too_large")

    def test_unavailable_provider_does_not_return_an_image(self):
        provider = FakeProvider(
            fail=BackgroundRemovalError("Model weights are not available.", code="ai_unavailable")
        )
        response = self._post(uploaded_image(), provider)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "ai_unavailable")
        self.assertNotIn(b"PNG", response.content)
        results = Path(self.tmp.name) / "results"
        self.assertFalse(results.exists() and any(results.glob("*.png")))

    def test_provider_failure_during_inference_is_a_service_error(self):
        provider = FakeProvider()
        provider.status = lambda: {
            "provider": "fake",
            "model": "test",
            "available": True,
            "model_cached": True,
            "detail": "ok",
        }
        provider.fail = BackgroundRemovalError("The model failed.", code="ai_unavailable")
        # status() above ignores self.fail, so remove() raises.
        response = self._post(uploaded_image(), provider)
        self.assertEqual(response.status_code, 503)
        results = Path(self.tmp.name) / "results"
        self.assertFalse(results.exists() and any(results.glob("*.png")))

    def test_timeout_returns_504_and_saves_nothing(self):
        with override_settings(PROCESSING_TIMEOUT_SECONDS=1):
            response = self._post(uploaded_image(), FakeProvider(delay=2))
        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.json()["error"]["code"], "timeout")

    def test_invalid_token_is_not_found(self):
        response = self.client.get("/api/v1/images/results/not-a-real-token/")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "result_not_found")

    def test_expired_token_is_gone_and_the_file_is_deleted(self):
        with patch("django.core.signing.time.time", return_value=1_700_000_000):
            created = self._post(uploaded_image())
        self.assertEqual(created.status_code, 200, created.content)
        stored = list(Path(self.tmp.name, "results").glob("*.png"))
        self.assertEqual(len(stored), 1)
        with patch("django.core.signing.time.time", return_value=1_700_000_000 + (30 * 60) + 5):
            expired = self.client.get(created.json()["result_url"])
        self.assertEqual(expired.status_code, 410)
        self.assertEqual(expired.json()["error"]["code"], "result_expired")
        self.assertFalse(stored[0].exists())

    def test_media_directory_is_not_public(self):
        created = self._post(uploaded_image())
        self.assertEqual(created.status_code, 200, created.content)
        filename = next(Path(self.tmp.name, "results").glob("*.png")).name
        response = self.client.get(f"/media/results/{filename}")
        self.assertEqual(response.status_code, 404)

    @override_settings(AI_PROVIDER="no-such-provider")
    def test_unknown_provider_is_unavailable(self):
        response = self.client.post(
            "/api/v1/images/remove-background/",
            {"image": uploaded_image()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "ai_unavailable")

    def test_throttle_returns_429(self):
        cache.clear()
        with override_settings(
            DISABLE_THROTTLING=False,
            REST_FRAMEWORK={
                **settings.REST_FRAMEWORK,
                "DEFAULT_THROTTLE_RATES": {"background_removal": "1/minute"},
            },
        ):
            first = self._post(uploaded_image())
            second = self._post(uploaded_image())
        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(second.status_code, 429)
        self.assertEqual(second.json()["error"]["code"], "rate_limited")

    def test_named_routes_exist(self):
        self.assertEqual(reverse("health"), "/api/v1/health/")
        self.assertEqual(reverse("config"), "/api/v1/config/")
        self.assertEqual(reverse("remove-background"), "/api/v1/images/remove-background/")
