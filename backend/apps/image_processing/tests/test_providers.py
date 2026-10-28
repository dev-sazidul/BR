import io
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings, tag
from PIL import Image, ImageDraw

from apps.image_processing.exceptions import BackgroundRemovalError
from apps.image_processing.services.providers.http import HttpProvider
from apps.image_processing.services.providers.rembg import RembgProvider, model_is_cached
from apps.image_processing.services.removal import remove_background


class _Body:
    def __init__(self, data: bytes):
        self._data = data

    def read(self, limit: int = -1) -> bytes:
        if limit < 0 or limit >= len(self._data):
            data = self._data
            self._data = b""
            return data
        data = self._data[:limit]
        self._data = self._data[limit:]
        return data

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGBA", (4, 4), (1, 2, 3, 255)).save(buffer, format="PNG")
    return buffer.getvalue()


class RembgProviderTests(SimpleTestCase):
    def test_status_is_honest_about_installation(self):
        report = RembgProvider().status()
        self.assertEqual(report["provider"], "rembg")
        self.assertIsInstance(report["available"], bool)
        self.assertIn("detail", report)
        if not report["available"]:
            self.assertIn("not installed", report["detail"])

    def test_missing_model_cache_is_false(self):
        with patch("apps.image_processing.services.providers.rembg.Path.home", return_value="/no/such/home"):
            with patch.dict("os.environ", {"U2NET_HOME": "/tmp/solva-missing-models"}, clear=False):
                self.assertFalse(model_is_cached("u2net"))


class HttpProviderTests(SimpleTestCase):
    @override_settings(AI_HTTP_ENDPOINT="", AI_HTTP_API_KEY="")
    def test_status_requires_an_endpoint(self):
        report = HttpProvider().status()
        self.assertFalse(report["available"])
        self.assertIn("AI_HTTP_ENDPOINT", report["detail"])

    @override_settings(AI_HTTP_ENDPOINT="ftp://example.test/remove", AI_HTTP_API_KEY="")
    def test_status_rejects_non_http_endpoints(self):
        self.assertFalse(HttpProvider().status()["available"])

    @override_settings(
        AI_PROVIDER="http",
        AI_HTTP_ENDPOINT="https://example.test/remove",
        AI_HTTP_API_KEY="super-secret",
        AI_HTTP_TIMEOUT_SECONDS=5,
    )
    def test_remove_posts_the_image_and_returns_rgba(self):
        captured = {}

        def open_request(request, timeout=None):
            captured["url"] = request.full_url
            captured["auth"] = request.get_header("Authorization")
            captured["timeout"] = timeout
            return _Body(_png_bytes())

        opener = MagicMock()
        opener.open.side_effect = open_request
        image = Image.new("RGB", (4, 4), (255, 0, 0))
        with patch("apps.image_processing.services.providers.http.build_opener", return_value=opener):
            result = HttpProvider().remove(image)
        self.assertEqual(result.mode, "RGBA")
        self.assertEqual(captured["url"], "https://example.test/remove")
        self.assertEqual(captured["auth"], "Bearer super-secret")
        self.assertEqual(captured["timeout"], 5)
        result.close()
        image.close()

    @override_settings(AI_HTTP_ENDPOINT="https://example.test/remove", AI_HTTP_API_KEY="")
    def test_non_image_response_is_an_error(self):
        opener = MagicMock()
        opener.open.return_value = _Body(b"not-an-image")
        image = Image.new("RGB", (4, 4), (0, 0, 0))
        with patch("apps.image_processing.services.providers.http.build_opener", return_value=opener):
            with self.assertRaises(BackgroundRemovalError):
                HttpProvider().remove(image)
        image.close()


class RemovalServiceTests(SimpleTestCase):
    def test_unavailable_provider_raises_before_inference(self):
        provider = MagicMock()
        provider.status.return_value = {
            "provider": "fake",
            "model": None,
            "available": False,
            "model_cached": False,
            "detail": "Model weights are not available.",
        }
        image = Image.new("RGB", (4, 4), (1, 2, 3))
        with patch("apps.image_processing.services.removal.get_provider", return_value=provider):
            with self.assertRaises(BackgroundRemovalError) as caught:
                remove_background(image, timeout_seconds=2)
        provider.remove.assert_not_called()
        self.assertEqual(caught.exception.status_code, 503)
        image.close()


@tag("integration")
class RealRembgTests(SimpleTestCase):
    def test_cached_model_returns_a_transparent_png(self):
        provider = RembgProvider()
        report = provider.status()
        if not report["available"]:
            self.skipTest(report["detail"])
        if not report["model_cached"]:
            self.skipTest("ONNX weights are not downloaded. See the README.")

        image = Image.new("RGB", (64, 64), (0, 180, 0))
        draw = ImageDraw.Draw(image)
        draw.ellipse((8, 8, 56, 56), fill=(220, 30, 30))
        result = provider.remove(image)
        self.assertEqual(result.mode, "RGBA")
        self.assertLess(result.getpixel((0, 0))[3], 40)
        self.assertGreater(result.getpixel((32, 32))[3], 200)
        result.close()
        image.close()
