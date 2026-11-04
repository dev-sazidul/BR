"""Solva background remover: an internal FastAPI service.

Next.js is the only client. It sends the raw image bytes as the request body and
receives a transparent PNG. Nothing is written to disk except the model file.

Keep this service on a private network. It has no accounts and no rate limits of
its own; Next.js applies those. Set REMOVER_TOKEN on both sides to require a
shared secret on /remove as well.

Run locally:
    python background_remover.py            # serves on 127.0.0.1:8001
    python background_remover.py download   # fetches the model and exits

The model is U²-Net through ONNX Runtime, using the public weights published for
rembg. The rembg package itself is not used: it pulls OpenCV, SciPy, and Numba,
which add a lot of install size for no gain here.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import os
import sys
import threading
import urllib.request
from contextlib import asynccontextmanager
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from PIL import Image, ImageOps, UnidentifiedImageError
from PIL.Image import DecompressionBombError

logger = logging.getLogger("solva.remover")

# --------------------------------------------------------------------------- settings


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    return int(raw) if raw else default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    model: str
    max_upload_bytes: int
    max_dimension_px: int
    max_image_pixels: int
    timeout_seconds: int
    token: str
    preload: bool


def load_settings() -> Settings:
    return Settings(
        model=os.environ.get("REMBG_MODEL", "u2net").strip() or "u2net",
        max_upload_bytes=_env_int("MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
        max_dimension_px=_env_int("MAX_DIMENSION_PX", 4096),
        max_image_pixels=_env_int("MAX_IMAGE_PIXELS", 16_000_000),
        timeout_seconds=_env_int("PROCESSING_TIMEOUT_SECONDS", 120),
        token=os.environ.get("REMOVER_TOKEN", "").strip(),
        preload=_env_bool("REMOVER_PRELOAD", True),
    )


settings = load_settings()

SUPPORTED_FORMATS = ("PNG", "JPEG", "WEBP")

# ----------------------------------------------------------------------------- errors


class RemoverError(Exception):
    def __init__(self, code: str, message: str, status_code: int):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        {"error": {"code": code, "message": message, "details": {}}},
        status_code=status_code,
    )


# ------------------------------------------------------------------------- validation


def _invalid(message: str = "This file is not a valid PNG, JPG, or WebP image.") -> RemoverError:
    return RemoverError("invalid_image", message, 400)


def _too_large(message: str = "That image is too large to process safely.") -> RemoverError:
    return RemoverError("dimensions_too_large", message, 400)


def open_upload(data: bytes) -> Image.Image:
    """Check the bytes are one real PNG, JPEG, or WebP frame within the limits.

    Size and dimensions are checked from the header before the pixels are
    decoded, so an oversized image is refused without allocating it.
    """

    if len(data) > settings.max_upload_bytes:
        raise RemoverError(
            "file_too_large",
            f"That file is larger than the {settings.max_upload_bytes} byte limit.",
            413,
        )
    if not data:
        raise RemoverError("empty_file", "That file is empty.", 400)

    Image.MAX_IMAGE_PIXELS = settings.max_image_pixels
    try:
        with Image.open(BytesIO(data)) as probe:
            probe.verify()
    except DecompressionBombError:
        raise _too_large() from None
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise _invalid() from exc

    try:
        image = Image.open(BytesIO(data))
    except DecompressionBombError:
        raise _too_large() from None
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise _invalid() from exc

    try:
        if (image.format or "").upper() not in SUPPORTED_FORMATS:
            raise RemoverError("unsupported_format", "Use a PNG, JPG, or WebP image.", 400)
        if getattr(image, "is_animated", False) or getattr(image, "n_frames", 1) > 1:
            raise RemoverError(
                "unsupported_format",
                "Animated images are not supported. Export a single frame and try again.",
                400,
            )
        width, height = image.size
        if width < 1 or height < 1:
            raise _invalid("This image has no visible pixels.")
        limit = settings.max_dimension_px
        if width > limit or height > limit:
            raise _too_large(
                f"This image is {width}×{height} pixels. Each side must be {limit} pixels or less."
            )
        if width * height > settings.max_image_pixels:
            raise _too_large("That image has too many pixels to process safely.")
        try:
            image.load()
            oriented = ImageOps.exif_transpose(image)
        except DecompressionBombError:
            raise _too_large() from None
        except (OSError, ValueError, SyntaxError) as exc:
            raise _invalid("This image could not be read.") from exc
    except BaseException:
        image.close()
        raise

    if oriented is not image:
        image.close()
    return oriented


# ------------------------------------------------------------------------------ model

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
    return (model_home() / f"{model_name}.onnx").is_file()


def model_status() -> dict:
    """Report whether removal can run. Never claims a missing engine is ready."""

    model = settings.model
    report = {"model": model, "available": False, "model_cached": False, "detail": ""}
    try:
        import onnxruntime  # noqa: F401
    except ImportError:
        report["detail"] = "Background removal is unavailable because onnxruntime is not installed."
        return report
    if model not in _MODELS:
        report["detail"] = f"REMBG_MODEL must be one of: {', '.join(sorted(_MODELS))}."
        return report
    cached = model_is_cached(model)
    report["available"] = True
    report["model_cached"] = cached
    report["detail"] = (
        "The ONNX runtime is installed and the model file is on disk."
        if cached
        else "The ONNX runtime is installed. The model file is not on disk yet and will be "
        "downloaded before the first removal."
    )
    return report


def _model_path(model_name: str) -> Path:
    spec = _MODELS.get(model_name)
    if spec is None:
        supported = ", ".join(sorted(_MODELS))
        raise RemoverError(
            "ai_unavailable", f"This server supports these models: {supported}.", 503
        )
    url, checksum, max_bytes = spec
    destination = model_home() / f"{model_name}.onnx"
    if not destination.is_file():
        _download_model(url, destination, checksum, max_bytes)
    return destination


def _download_model(url: str, destination: Path, checksum: str, max_bytes: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(".onnx.part")
    digest = hashlib.md5()
    size = 0
    request = urllib.request.Request(url, headers={"User-Agent": "solva"})
    logger.info("Downloading %s to %s", url, destination)
    try:
        with urllib.request.urlopen(request, timeout=60) as response, partial.open("wb") as handle:
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise RemoverError(
                        "ai_unavailable", "The model download is larger than expected.", 503
                    )
                digest.update(chunk)
                handle.write(chunk)
        if digest.hexdigest() != checksum:
            raise RemoverError(
                "ai_unavailable", "The downloaded model file did not match its checksum.", 503
            )
        partial.replace(destination)
    except RemoverError:
        partial.unlink(missing_ok=True)
        raise
    except Exception as exc:
        partial.unlink(missing_ok=True)
        raise RemoverError(
            "ai_unavailable",
            "The model file could not be downloaded. Check the server's network access and try again.",
            503,
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
    mask = Image.fromarray((normalized.clip(0, 1) * 255).astype(np.uint8))
    # Bilinear, not Lanczos: Lanczos rings around a hard mask edge.
    return mask.resize(image.size, Image.Resampling.BILINEAR)


def predict_mask(image: Image.Image) -> Image.Image:
    """Return an L-mode alpha mask the same size as `image`. Inference is serialized."""

    model = settings.model
    try:
        with _inference_lock:
            return _mask(_get_session(model), image)
    except RemoverError:
        raise
    except Exception as exc:
        logger.exception("ONNX background removal failed for model %s", model)
        raise RemoverError(
            "ai_unavailable",
            "The AI model could not process this image. If this is the first request, "
            "the model may still be downloading or the download may have failed.",
            503,
        ) from exc


# ------------------------------------------------------------------------------ matte


def refine_cutout(image: Image.Image) -> Image.Image:
    """Remove the old background colour from the soft edge of a cutout.

    U²-Net only replaces the alpha channel. Edge pixels still contain the old
    background, which shows as a halo on a new one. Solid interior pixels are
    left alone so skin, clothes, and hair keep their colour.
    """

    rgba = np.asarray(image.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].astype(np.float32) / 255.0
    cleaned_rgb, cleaned_alpha = refine_matte(rgb, alpha)
    output = np.empty_like(rgba)
    output[:, :, :3] = np.clip(np.rint(cleaned_rgb), 0, 255).astype(np.uint8)
    output[:, :, 3] = np.clip(np.rint(cleaned_alpha * 255.0), 0, 255).astype(np.uint8)
    return Image.fromarray(output)


def refine_matte(rgb: np.ndarray, alpha: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    height, width = alpha.shape
    known = alpha < 0.08
    if float(known.mean()) < 0.01:
        return rgb, alpha

    radius = int(np.clip(round(min(height, width) / 80), 3, 12))
    weight = known.astype(np.float32)
    blurred_weight = _box_blur(weight, radius)
    blurred_color = _box_blur(rgb * weight[:, :, None], radius)
    safe = blurred_weight > 0.02
    background = np.empty_like(rgb)
    background[safe] = blurred_color[safe] / blurred_weight[safe, None]
    background[~safe] = rgb[known].mean(axis=0) if known.any() else rgb.reshape(-1, 3).mean(axis=0)

    distance = np.linalg.norm(rgb - background, axis=2)
    # Only pixels that still match the old background lose alpha. A colour 55
    # steps away (blonde hair on a warm wall, a white shirt on gray) is kept.
    similarity = np.clip((48.0 - distance) / 48.0, 0.0, 1.0)
    uncertain = alpha < 0.86
    next_alpha = np.where(uncertain, alpha * (1.0 - similarity), alpha)
    next_alpha = np.where(next_alpha < 2 / 255, 0.0, next_alpha)

    coverage = np.clip(alpha, 0.12, 1.0)[:, :, None]
    foreground = (rgb - background * (1.0 - coverage)) / coverage
    edge = (next_alpha > 0.04) & (alpha < 0.98)
    next_rgb = np.where(edge[:, :, None], np.clip(foreground, 0.0, 255.0), rgb)
    return next_rgb.astype(np.float32), next_alpha.astype(np.float32)


def _box_blur(values: np.ndarray, radius: int) -> np.ndarray:
    return _blur_axis(_blur_axis(values, radius, axis=1), radius, axis=0)


def _blur_axis(values: np.ndarray, radius: int, axis: int) -> np.ndarray:
    pad = [(0, 0)] * values.ndim
    pad[axis] = (radius, radius)
    padded = np.pad(values, pad, mode="edge")
    cumulative = np.cumsum(padded, axis=axis, dtype=np.float64)
    zero_shape = list(cumulative.shape)
    zero_shape[axis] = 1
    cumulative = np.concatenate([np.zeros(zero_shape, dtype=np.float64), cumulative], axis=axis)
    window = 2 * radius + 1
    end = np.take(cumulative, range(window, cumulative.shape[axis]), axis=axis)
    start = np.take(cumulative, range(0, cumulative.shape[axis] - window), axis=axis)
    return ((end - start) / window).astype(np.float32)


# --------------------------------------------------------------------------- pipeline


def process_image(data: bytes) -> tuple[bytes, int, int]:
    """Validate, cut out, and encode one image. Returns (png, width, height)."""

    image = open_upload(data)
    prepared = image
    try:
        if image.mode not in {"RGB", "RGBA"}:
            prepared = image.convert("RGBA")
        report = model_status()
        if not report["available"]:
            raise RemoverError("ai_unavailable", report["detail"], 503)
        mask = predict_mask(prepared)
        cutout = prepared.convert("RGBA")
        cutout.putalpha(mask)
        refined = refine_cutout(cutout)
        cutout.close()
        mask.close()
        try:
            buffer = BytesIO()
            refined.save(buffer, format="PNG", optimize=True)
            return buffer.getvalue(), refined.width, refined.height
        finally:
            refined.close()
    except RemoverError:
        raise
    except Exception as exc:
        logger.exception("Background removal failed")
        raise RemoverError("ai_unavailable", "The image could not be processed.", 503) from exc
    finally:
        if prepared is not image:
            prepared.close()
        image.close()


# --------------------------------------------------------------------------- HTTP API


def _preload() -> None:
    try:
        if model_status()["available"]:
            with _inference_lock:
                _get_session(settings.model)
            logger.info("Model %s is loaded.", settings.model)
    except Exception:
        logger.exception("Model preload failed. The first removal will try again.")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.preload:
        threading.Thread(target=_preload, name="solva-preload", daemon=True).start()
    yield


app = FastAPI(title="Solva background remover (internal)", version="2.0.0", lifespan=lifespan)


def _authorized(request: Request) -> bool:
    if not settings.token:
        return True
    supplied = request.headers.get("x-remover-token", "")
    return hmac.compare_digest(supplied.encode(), settings.token.encode())


async def _read_body(request: Request, limit: int) -> bytes:
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        raise RemoverError(
            "file_too_large", f"That file is larger than the {limit} byte limit.", 413
        )
    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > limit:
            raise RemoverError(
                "file_too_large", f"That file is larger than the {limit} byte limit.", 413
            )
        chunks.append(chunk)
    return b"".join(chunks)


@app.get("/health")
def health() -> dict:
    report = model_status()
    return {"status": "ok" if report["available"] else "degraded", **report}


@app.post("/remove")
async def remove(request: Request) -> Response:
    if not _authorized(request):
        return error_response("unauthorized", "A valid remover token is required.", 401)
    try:
        data = await _read_body(request, settings.max_upload_bytes)
        png, width, height = await asyncio.wait_for(
            asyncio.to_thread(process_image, data), timeout=settings.timeout_seconds
        )
    except TimeoutError:
        # ONNX inference cannot be cancelled cleanly. The worker thread may
        # finish later; its result is discarded.
        logger.warning("Background removal exceeded %s seconds", settings.timeout_seconds)
        return error_response("timeout", "Background removal took too long and was stopped.", 504)
    except RemoverError as exc:
        return error_response(exc.code, exc.message, exc.status_code)

    logger.info("Removed background %sx%s model=%s", width, height, settings.model)
    return Response(
        png,
        media_type="image/png",
        headers={"X-Image-Width": str(width), "X-Image-Height": str(height)},
    )


def main(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    if argv[:1] == ["download"]:
        path = _model_path(settings.model)
        print(f"Model {settings.model} is at {path}")
        return 0
    import uvicorn

    host = os.environ.get("REMOVER_HOST", "127.0.0.1")
    port = _env_int("REMOVER_PORT", 8001)
    uvicorn.run(app, host=host, port=port, log_level="info")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
