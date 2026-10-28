"""Temporary result files and signed download tokens.

The original upload is not written to disk. Only the transparent PNG result is
kept, under a random name, until the retention window ends.
"""

import re
import uuid
from datetime import timedelta
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils import timezone
from PIL import Image

from apps.image_processing.exceptions import ResultExpired, ResultNotFound

_FILENAME = re.compile(r"^[a-f0-9]{32}\.png$")
_SIGNER = TimestampSigner(salt="solva-image-result")
_PART_MAX_AGE_SECONDS = 60 * 60


def results_dir() -> Path:
    path = Path(settings.MEDIA_ROOT) / "results"
    path.mkdir(parents=True, exist_ok=True)
    return path


def retention_seconds() -> int:
    return int(settings.IMAGE_RETENTION_MINUTES) * 60


def save_png(image: Image.Image, original_filename: str) -> dict:
    # copy() so closing the encoded image never closes the caller's image.
    copied = image.copy()
    rgba = copied.convert("RGBA")
    if rgba is not copied:
        copied.close()
    file_id = uuid.uuid4().hex
    filename = f"{file_id}.png"
    destination = results_dir() / filename
    temporary = results_dir() / f"{file_id}.png.part"
    try:
        rgba.save(temporary, format="PNG", optimize=True)
        temporary.replace(destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    finally:
        rgba.close()

    token = _SIGNER.sign(filename)
    expires_at = timezone.now() + timedelta(seconds=retention_seconds())
    return {
        "id": file_id,
        "original_filename": original_filename,
        "width": image.size[0],
        "height": image.size[1],
        "output_format": "png",
        "result_url": f"/api/v1/images/results/{quote(token, safe='')}/",
        "download_url": f"/api/v1/images/results/{quote(token, safe='')}/download/",
        "expires_at": expires_at.isoformat(),
    }


def resolve_result(token: str) -> Path:
    try:
        filename = _SIGNER.unsign(token, max_age=retention_seconds())
    except SignatureExpired:
        _delete_expired(token)
        raise ResultExpired() from None
    except BadSignature:
        raise ResultNotFound() from None

    return _checked_path(filename)


def _delete_expired(token: str) -> None:
    try:
        filename = _SIGNER.unsign(token)
    except BadSignature:
        return
    if not _FILENAME.fullmatch(filename):
        return
    path = (results_dir() / filename).resolve()
    root = results_dir().resolve()
    if path.parent != root:
        return
    path.unlink(missing_ok=True)


def _checked_path(filename: str) -> Path:
    if not isinstance(filename, str) or not _FILENAME.fullmatch(filename):
        raise ResultNotFound()
    root = results_dir().resolve()
    path = (root / filename).resolve()
    if path.parent != root or not path.is_file():
        raise ResultNotFound()
    return path
