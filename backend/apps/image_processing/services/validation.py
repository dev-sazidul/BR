import re
from pathlib import Path

from django.conf import settings
from PIL import Image, ImageOps, UnidentifiedImageError
from PIL.Image import DecompressionBombError

from apps.image_processing.exceptions import ImageValidationError

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


def public_filename(name: str | None) -> str:
    base = Path(name or "image").name
    base = _CONTROL_CHARS.sub("", base).strip().replace('"', "")
    if not base or base in {".", ".."}:
        return "image"
    return base[:120]


def _reject(code: str, message: str, status_code: int) -> None:
    raise ImageValidationError(code, message, status_code)


def read_limited(upload) -> bytes:
    size = getattr(upload, "size", None)
    if size is not None and size > settings.MAX_UPLOAD_BYTES:
        _reject(
            "file_too_large",
            f"That file is larger than the {settings.MAX_UPLOAD_BYTES} byte limit.",
            413,
        )

    chunks: list[bytes] = []
    total = 0
    reader = upload.chunks() if hasattr(upload, "chunks") else _iter_bytes(upload)
    for chunk in reader:
        total += len(chunk)
        if total > settings.MAX_UPLOAD_BYTES:
            _reject(
                "file_too_large",
                f"That file is larger than the {settings.MAX_UPLOAD_BYTES} byte limit.",
                413,
            )
        chunks.append(chunk)

    data = b"".join(chunks)
    if not data:
        _reject("empty_file", "That file is empty.", 400)
    return data


def _iter_bytes(upload):
    upload.seek(0)
    while True:
        chunk = upload.read(1024 * 1024)
        if not chunk:
            break
        yield chunk


def validate_upload(upload) -> Image.Image:
    """Verify the upload is a real PNG, JPEG, or WebP within the configured limits."""

    data = read_limited(upload)
    Image.MAX_IMAGE_PIXELS = settings.MAX_IMAGE_PIXELS

    from io import BytesIO

    buffer = BytesIO(data)
    try:
        with Image.open(buffer) as probe:
            probe.verify()
    except DecompressionBombError:
        _reject(
            "dimensions_too_large",
            "That image is too large to process safely.",
            400,
        )
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise ImageValidationError(
            "invalid_image",
            "This file is not a valid PNG, JPG, or WebP image.",
            400,
        ) from exc

    buffer.seek(0)
    try:
        image = Image.open(buffer)
        image.load()
    except DecompressionBombError:
        _reject(
            "dimensions_too_large",
            "That image is too large to process safely.",
            400,
        )
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise ImageValidationError(
            "invalid_image",
            "This file is not a valid PNG, JPG, or WebP image.",
            400,
        ) from exc

    image_format = (image.format or "").upper()
    if image_format not in settings.SUPPORTED_IMAGE_FORMATS:
        image.close()
        _reject(
            "unsupported_format",
            "Use a PNG, JPG, or WebP image.",
            400,
        )

    if getattr(image, "is_animated", False) or getattr(image, "n_frames", 1) > 1:
        image.close()
        _reject(
            "unsupported_format",
            "Animated images are not supported. Export a single frame and try again.",
            400,
        )

    try:
        transposed = ImageOps.exif_transpose(image)
    except (OSError, ValueError) as exc:
        image.close()
        raise ImageValidationError(
            "invalid_image",
            "This image could not be read.",
            400,
        ) from exc
    if transposed is not image:
        image.close()
        image = transposed

    width, height = image.size
    if width < 1 or height < 1:
        image.close()
        _reject("invalid_image", "This image has no visible pixels.", 400)

    if width > settings.MAX_DIMENSION_PX or height > settings.MAX_DIMENSION_PX:
        image.close()
        _reject(
            "dimensions_too_large",
            (
                f"This image is {width}×{height} pixels. "
                f"Each side must be {settings.MAX_DIMENSION_PX} pixels or less."
            ),
            400,
        )

    if width * height > settings.MAX_IMAGE_PIXELS:
        image.close()
        _reject(
            "dimensions_too_large",
            "That image has too many pixels to process safely.",
            400,
        )

    return image
