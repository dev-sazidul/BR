import io
import tempfile
import time
from pathlib import Path
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from PIL import Image

from apps.image_processing.exceptions import ImageValidationError
from apps.image_processing.services.cleanup import cleanup_expired
from apps.image_processing.services.validation import public_filename, validate_upload


class FilenameTests(SimpleTestCase):
    def test_public_filename_strips_paths_and_control_characters(self):
        self.assertEqual(public_filename("../../secret.png"), "secret.png")
        self.assertEqual(public_filename("a\nb.png"), "ab.png")
        self.assertEqual(public_filename(""), "image")
        self.assertEqual(public_filename(".."), "image")


class ValidationTests(SimpleTestCase):
    def test_decompression_bomb_is_rejected(self):
        upload = SimpleUploadedFile("bomb.png", b"\x89PNG\r\n\x1a\nnot-real", content_type="image/png")
        with patch(
            "apps.image_processing.services.validation.Image.open",
            side_effect=Image.DecompressionBombError("too many pixels"),
        ):
            with self.assertRaises(ImageValidationError) as caught:
                validate_upload(upload)
        self.assertEqual(caught.exception.code, "dimensions_too_large")

    def test_animated_webp_is_rejected(self):
        frames = [
            Image.new("RGBA", (8, 8), (255, 0, 0, 255)),
            Image.new("RGBA", (8, 8), (0, 0, 255, 255)),
        ]
        buffer = io.BytesIO()
        frames[0].save(
            buffer,
            format="WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=100,
            loop=0,
        )
        upload = SimpleUploadedFile("anim.webp", buffer.getvalue(), content_type="image/webp")
        with self.assertRaises(ImageValidationError) as caught:
            validate_upload(upload)
        self.assertEqual(caught.exception.code, "unsupported_format")


class CleanupTests(TestCase):
    def test_cleanup_removes_old_results_and_stale_partial_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            with override_settings(MEDIA_ROOT=tmp, IMAGE_RETENTION_MINUTES=30):
                results = Path(tmp) / "results"
                results.mkdir()
                fresh = results / ("a" * 32 + ".png")
                old = results / ("b" * 32 + ".png")
                partial = results / ("c" * 32 + ".png.part")
                fresh.write_bytes(b"fresh")
                old.write_bytes(b"old")
                partial.write_bytes(b"partial")
                now = time.time()
                fresh_time = now - 60
                old_time = now - (31 * 60)
                partial_time = now - (2 * 60 * 60)
                import os

                os.utime(fresh, (fresh_time, fresh_time))
                os.utime(old, (old_time, old_time))
                os.utime(partial, (partial_time, partial_time))

                removed = cleanup_expired()

                self.assertEqual(removed, 2)
                self.assertTrue(fresh.exists())
                self.assertFalse(old.exists())
                self.assertFalse(partial.exists())
