"""rembg adapter.

The ONNX session is loaded on the first removal, not during health checks.
Model files are downloaded by rembg into U2NET_HOME (default ~/.u2net).
"""

import logging
import os
import threading
from pathlib import Path

from django.conf import settings
from PIL import Image

from apps.image_processing.exceptions import BackgroundRemovalError

from .base import BackgroundRemovalProvider

logger = logging.getLogger(__name__)

_session = None
_session_model: str | None = None
_session_lock = threading.Lock()
_inference_lock = threading.Lock()


def model_is_cached(model_name: str) -> bool:
    configured = os.environ.get("U2NET_HOME")
    root = Path(configured) if configured else Path.home() / ".u2net"
    if not root.is_dir():
        return False
    prefix = model_name.lower()
    for path in root.glob("*.onnx"):
        if path.stem.lower().startswith(prefix):
            return True
    return False


def _get_session(model_name: str):
    global _session, _session_model
    with _session_lock:
        if _session is not None and _session_model == model_name:
            return _session
        from rembg import new_session

        _session = new_session(model_name)
        _session_model = model_name
        return _session


class RembgProvider(BackgroundRemovalProvider):
    name = "rembg"

    def status(self) -> dict:
        model = settings.REMBG_MODEL
        try:
            import rembg  # noqa: F401
        except ImportError:
            return {
                "provider": self.name,
                "model": model,
                "available": False,
                "model_cached": False,
                "detail": "Background removal is unavailable because the rembg package is not installed.",
            }
        cached = model_is_cached(model)
        if cached:
            detail = "rembg is installed and the ONNX model is on disk."
        else:
            detail = (
                "rembg is installed. The ONNX model is not on disk yet and will be "
                "downloaded on the first removal request."
            )
        return {
            "provider": self.name,
            "model": model,
            "available": True,
            "model_cached": cached,
            "detail": detail,
        }

    def remove(self, image: Image.Image) -> Image.Image:
        try:
            from rembg import remove
        except ImportError as exc:
            raise BackgroundRemovalError(
                "Background removal is unavailable because the rembg package is not installed."
            ) from exc

        model = settings.REMBG_MODEL
        try:
            with _inference_lock:
                session = _get_session(model)
                output = remove(image, session=session)
        except BackgroundRemovalError:
            raise
        except Exception as exc:
            logger.exception("rembg failed for model %s", model)
            raise BackgroundRemovalError(
                "The AI model could not process this image. If this is the first request, "
                "the model may still be downloading or the download may have failed."
            ) from exc

        if not isinstance(output, Image.Image):
            raise BackgroundRemovalError("The AI service returned an unexpected result.")
        return output.convert("RGBA")
