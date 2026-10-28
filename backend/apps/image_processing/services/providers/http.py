"""Generic HTTP adapter for an operator-configured removal endpoint.

The endpoint is taken from the environment, never from the upload request.
A redirect is treated as a failure so an Authorization header cannot follow
the request to another host.
"""

import logging
import uuid
from io import BytesIO
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from PIL import Image, UnidentifiedImageError

from apps.image_processing.exceptions import BackgroundRemovalError

from .base import BackgroundRemovalProvider

logger = logging.getLogger(__name__)

_MAX_RESPONSE_BYTES = 40 * 1024 * 1024


class _RefuseRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise BackgroundRemovalError(
            "The external AI service returned a redirect, which was refused."
        )


class HttpProvider(BackgroundRemovalProvider):
    name = "http"

    def status(self) -> dict:
        endpoint = settings.AI_HTTP_ENDPOINT
        if not endpoint:
            return {
                "provider": self.name,
                "model": None,
                "available": False,
                "model_cached": False,
                "detail": "AI_HTTP_ENDPOINT is not configured.",
            }
        if not _valid_endpoint(endpoint):
            return {
                "provider": self.name,
                "model": None,
                "available": False,
                "model_cached": False,
                "detail": "AI_HTTP_ENDPOINT must be an http or https URL.",
            }
        return {
            "provider": self.name,
            "model": None,
            "available": True,
            "model_cached": False,
            "detail": "An external HTTP background-removal endpoint is configured.",
        }

    def remove(self, image: Image.Image) -> Image.Image:
        report = self.status()
        if not report["available"]:
            raise BackgroundRemovalError(report["detail"])

        payload = BytesIO()
        image.save(payload, format="PNG")
        boundary = uuid.uuid4().hex
        body = _multipart(boundary, payload.getvalue())
        request = Request(
            settings.AI_HTTP_ENDPOINT,
            data=body,
            method="POST",
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "Accept": "image/png, image/webp, image/jpeg",
                "User-Agent": "Solva/1.0",
            },
        )
        if settings.AI_HTTP_API_KEY:
            request.add_header("Authorization", f"Bearer {settings.AI_HTTP_API_KEY}")

        opener = build_opener(_RefuseRedirects)
        try:
            with opener.open(request, timeout=settings.AI_HTTP_TIMEOUT_SECONDS) as response:
                raw = response.read(_MAX_RESPONSE_BYTES + 1)
        except HTTPError as exc:
            logger.warning("HTTP AI provider returned status %s", exc.code)
            raise BackgroundRemovalError("The external AI service rejected the image.") from exc
        except (URLError, TimeoutError, OSError) as exc:
            logger.warning("HTTP AI provider request failed")
            raise BackgroundRemovalError("The external AI service could not be reached.") from exc

        if len(raw) > _MAX_RESPONSE_BYTES:
            raise BackgroundRemovalError("The external AI service returned a response that is too large.")
        if not raw:
            raise BackgroundRemovalError("The external AI service returned an empty response.")

        try:
            result = Image.open(BytesIO(raw))
            result.load()
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise BackgroundRemovalError("The external AI service did not return an image.") from exc
        return result.convert("RGBA")


def _valid_endpoint(endpoint: str) -> bool:
    parsed = urlparse(endpoint)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _multipart(boundary: str, png_bytes: bytes) -> bytes:
    header = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="image"; filename="upload.png"\r\n'
        "Content-Type: image/png\r\n\r\n"
    ).encode()
    return header + png_bytes + f"\r\n--{boundary}--\r\n".encode()
