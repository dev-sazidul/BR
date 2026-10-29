"""U²-Net background removal through ONNX Runtime.

The public model files are the same weights published for rembg. This module
does not import that package: its dependency tree includes OpenCV, SciPy, and
Numba, which push a serverless bundle past the size limit. The mask is resized
without Lanczos ringing, then the edge color is cleaned in matte.py.
"""

import hashlib
import logging
import os
import threading
import urllib.request
from pathlib import Path

from django.conf import settings
from PIL import Image, ImageOps

from apps.image_processing.exceptions import BackgroundRemovalError
from apps.image_processing.services.matte import refine_cutout

from .base import BackgroundRemovalProvider

logger = logging.getLogger(__name__)

_MEAN = (0.485, 0.456, 0.406)
_STD = (0.229, 0.224, 0.225)
_INPUT_SIZE = (320, 320)
_MODELS = {
    "u2net": (
        "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx",
        "60024c5c889badc19c04ad937298a77b",
        190_000_000,
    ),
    "u2netp": (
        "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx",
        "8e83ca70e441ab06c318d82300c84806",
        12_000_000,
    ),
}

_session = None
_session_model: str | None = None
_session_lock = threading.Lock()
_inference_lock = threading.Lock()


def model_home() -> Path:
    configured = os.environ.get("U2NET_HOME")
    if configured:
        return Path(configured)
    return Path.home() / ".u2net"


def model_is_cached(model_name: str) -> bool:
    root = model_home()
    if not root.is_dir():
        return False
    prefix = model_name.lower()
    for path in root.glob("*.onnx"):
        if path.stem.lower() == prefix:
            return True
    return False


def _model_path(model_name: str) -> Path:
    spec = _MODELS.get(model_name)
    if spec is None:
        supported = ", ".join(sorted(_MODELS))
        raise BackgroundRemovalError(f"This server supports these models: {supported}.")
    url, checksum, max_bytes = spec
    destination = model_home() / f"{model_name}.onnx"
    if destination.is_file():
        return destination
    _download_model(url, destination, checksum, max_bytes)
    return destination


def _download_model(url: str, destination: Path, checksum: str, max_bytes: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(".onnx.part")
    digest = hashlib.md5()
    size = 0
    request = urllib.request.Request(url, headers={"User-Agent": "solva"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response, partial.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise BackgroundRemovalError("The model download is larger than expected.")
                digest.update(chunk)
                handle.write(chunk)
        if digest.hexdigest() != checksum:
            raise BackgroundRemovalError("The downloaded model file did not match its checksum.")
        partial.replace(destination)
    except BackgroundRemovalError:
        partial.unlink(missing_ok=True)
        raise
    except Exception as exc:
        partial.unlink(missing_ok=True)
        raise BackgroundRemovalError(
            "The model file could not be downloaded. Check the server's network access and try again."
        ) from exc


def _get_session(model_name: str):
    global _session, _session_model
    import onnxruntime as ort

    with _session_lock:
        if _session is not None and _session_model == model_name:
            return _session
        options = ort.SessionOptions()
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        _session = ort.InferenceSession(
            str(_model_path(model_name)),
            sess_options=options,
            providers=["CPUExecutionProvider"],
        )
        _session_model = model_name
        return _session


def _mask(session, image: Image.Image) -> Image.Image:
    import numpy as np

    resized = image.convert("RGB").resize(_INPUT_SIZE, Image.Resampling.LANCZOS)
    pixels = np.asarray(resized).astype(np.float32)
    pixels /= max(float(pixels.max()), 1e-6)
    for channel, (mean, std) in enumerate(zip(_MEAN, _STD, strict=True)):
        pixels[:, :, channel] = (pixels[:, :, channel] - mean) / std
    blob = np.transpose(pixels, (2, 0, 1))[None, ...]
    input_name = session.get_inputs()[0].name
    prediction = session.run(None, {input_name: blob})[0][:, 0, :, :]
    high = float(np.max(prediction))
    low = float(np.min(prediction))
    scale = high - low
    if scale < 1e-6:
        normalized = np.zeros_like(prediction)
    else:
        normalized = (prediction - low) / scale
    normalized = np.squeeze(normalized)
    mask = Image.fromarray((normalized.clip(0, 1) * 255).astype(np.uint8), mode="L")
    return mask.resize(image.size, Image.Resampling.BILINEAR)


class RembgProvider(BackgroundRemovalProvider):
    name = "rembg"

    def status(self) -> dict:
        model = settings.REMBG_MODEL
        try:
            import onnxruntime  # noqa: F401
        except ImportError:
            return {
                "provider": self.name,
                "model": model,
                "available": False,
                "model_cached": False,
                "detail": "Background removal is unavailable because onnxruntime is not installed.",
            }
        if model not in _MODELS:
            supported = ", ".join(sorted(_MODELS))
            return {
                "provider": self.name,
                "model": model,
                "available": False,
                "model_cached": False,
                "detail": f"REMBG_MODEL must be one of: {supported}.",
            }
        cached = model_is_cached(model)
        if cached:
            detail = "The ONNX runtime is installed and the model file is on disk."
        else:
            detail = (
                "The ONNX runtime is installed. The model file is not on disk yet and will be "
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
        oriented = ImageOps.exif_transpose(image)
        source = oriented if oriented is not None else image
        model = settings.REMBG_MODEL
        try:
            with _inference_lock:
                session = _get_session(model)
                mask = _mask(session, source)
        except BackgroundRemovalError:
            raise
        except Exception as exc:
            logger.exception("ONNX background removal failed for model %s", model)
            raise BackgroundRemovalError(
                "The AI model could not process this image. If this is the first request, "
                "the model may still be downloading or the download may have failed."
            ) from exc

        cutout = source.convert("RGBA")
        if cutout is source:
            cutout = source.copy()
        cutout.putalpha(mask)
        return refine_cutout(cutout)
