"""HTTP API for anonymous, single-image background removal."""

import logging
from io import BytesIO

from django.conf import settings
from django.http import FileResponse, HttpResponse
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from PIL import Image, UnidentifiedImageError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.image_processing.exceptions import APIError, error_response
from apps.image_processing.serializers import (
    ConfigResponseSerializer,
    ErrorResponseSerializer,
    HealthResponseSerializer,
    RemovalResponseSerializer,
    RemoveBackgroundSerializer,
)
from apps.image_processing.services.cleanup import cleanup_expired
from apps.image_processing.services.colors import flatten_on_color, parse_hex_color
from apps.image_processing.services.providers import get_provider
from apps.image_processing.services.removal import remove_background
from apps.image_processing.services.storage import resolve_result, save_png
from apps.image_processing.services.validation import public_filename, validate_upload
from apps.image_processing.throttling import BackgroundRemovalThrottle

logger = logging.getLogger(__name__)


def _safe_cleanup() -> None:
    try:
        cleanup_expired()
    except OSError:
        logger.exception("Temporary file cleanup failed")


class HealthView(APIView):
    @extend_schema(
        tags=["System"],
        summary="Service health",
        description=(
            "The process is up when this returns 200. Read `ai.available` before uploading. "
            "A degraded status still means the HTTP service is running. It does not mean a cutout was produced."
        ),
        responses={200: HealthResponseSerializer},
    )
    def get(self, request):
        try:
            ai = get_provider().status()
        except APIError as exc:
            ai = {
                "provider": settings.AI_PROVIDER,
                "model": None,
                "available": False,
                "model_cached": False,
                "detail": exc.message,
            }
        return Response(
            {
                "status": "ok" if ai.get("available") else "degraded",
                "service": "solva-api",
                "ai": ai,
            }
        )


class ConfigView(APIView):
    @extend_schema(
        tags=["System"],
        summary="Public configuration",
        description="Upload limits, formats, retention, and the configured model name. Secrets are omitted.",
        responses={200: ConfigResponseSerializer},
    )
    def get(self, request):
        model = settings.REMBG_MODEL if settings.AI_PROVIDER == "rembg" else None
        return Response(
            {
                "max_upload_bytes": settings.MAX_UPLOAD_BYTES,
                "max_dimension_px": settings.MAX_DIMENSION_PX,
                "supported_formats": list(settings.SUPPORTED_IMAGE_FORMATS),
                "output_formats": ["png", "jpeg"],
                "retention_minutes": settings.IMAGE_RETENTION_MINUTES,
                "ai_provider": settings.AI_PROVIDER,
                "ai_model": model,
                "contact_email": settings.CONTACT_EMAIL or None,
            }
        )


class RemoveBackgroundView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [BackgroundRemovalThrottle]

    @extend_schema(
        tags=["Images"],
        summary="Remove a background",
        description=(
            "Send one image as multipart field `image`. The original file is not stored. "
            "The response contains signed URLs for the transparent PNG. "
            "503 means the model is unavailable. 504 means processing exceeded the timeout. "
            "Neither response includes a fake cutout."
        ),
        request={"multipart/form-data": RemoveBackgroundSerializer},
        responses={
            200: RemovalResponseSerializer,
            400: ErrorResponseSerializer,
            413: ErrorResponseSerializer,
            429: ErrorResponseSerializer,
            503: ErrorResponseSerializer,
            504: ErrorResponseSerializer,
        },
    )
    def post(self, request):
        _safe_cleanup()
        serializer = RemoveBackgroundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data["image"]

        image = None
        processed = None
        try:
            image = validate_upload(upload)
            processed = remove_background(image, settings.PROCESSING_TIMEOUT_SECONDS)
            payload = save_png(processed, public_filename(getattr(upload, "name", "image")))
        except APIError as exc:
            return error_response(exc.code, exc.message, exc.status_code)
        finally:
            if image is not None:
                image.close()
            if processed is not None:
                processed.close()

        logger.info(
            "Removed background id=%s dimensions=%sx%s provider=%s",
            payload["id"],
            payload["width"],
            payload["height"],
            settings.AI_PROVIDER,
        )
        return Response(payload)


class ResultView(APIView):
    @extend_schema(
        tags=["Images"],
        summary="Preview a cutout",
        description="Returns the transparent PNG inline. The token is the signed value from result_url.",
        responses={
            200: OpenApiResponse(description="Inline image/png with a real alpha channel."),
            404: ErrorResponseSerializer,
            410: ErrorResponseSerializer,
        },
    )
    def get(self, request, token: str):
        try:
            path = resolve_result(token)
        except APIError as exc:
            return error_response(exc.code, exc.message, exc.status_code)
        handle = path.open("rb")
        response = FileResponse(
            handle,
            content_type="image/png",
            as_attachment=False,
            filename="solva-cutout.png",
        )
        response["Cache-Control"] = "private, max-age=60"
        return response


class ResultDownloadView(APIView):
    @extend_schema(
        tags=["Images"],
        summary="Download a cutout",
        description=(
            "PNG keeps transparency. JPEG flattens the cutout onto `background`, which must be #RRGGBB. "
            "The default background is white. `jpg` is accepted as an alias of `jpeg`."
        ),
        parameters=[
            OpenApiParameter(
                name="format",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                enum=["png", "jpeg", "jpg"],
                description="Download format. Defaults to png.",
            ),
            OpenApiParameter(
                name="background",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Hex color used when format is jpeg. Example: #FFFFFF.",
            ),
        ],
        responses={
            200: OpenApiResponse(description="Attachment image/png or image/jpeg."),
            400: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
            410: ErrorResponseSerializer,
            500: ErrorResponseSerializer,
        },
    )
    def get(self, request, token: str):
        output_format = (request.query_params.get("format") or "png").lower()
        if output_format == "jpg":
            output_format = "jpeg"
        if output_format not in {"png", "jpeg"}:
            return error_response("invalid_format", "Format must be png or jpeg.", 400)

        background = request.query_params.get("background") or "#FFFFFF"
        color = (255, 255, 255)
        try:
            path = resolve_result(token)
            if output_format == "jpeg":
                color = parse_hex_color(background)
        except APIError as exc:
            return error_response(exc.code, exc.message, exc.status_code)

        if output_format == "png":
            handle = path.open("rb")
            response = FileResponse(
                handle,
                content_type="image/png",
                as_attachment=True,
                filename="solva-cutout.png",
            )
            response["Cache-Control"] = "private, max-age=60"
            return response

        try:
            encoded = _jpeg_bytes(path, color)
        except (UnidentifiedImageError, OSError, ValueError):
            logger.exception("Could not encode JPEG for a stored result")
            return error_response("processing_failed", "The JPEG could not be created.", 500)

        response = HttpResponse(encoded, content_type="image/jpeg")
        response["Content-Disposition"] = 'attachment; filename="solva-cutout.jpg"'
        response["Cache-Control"] = "private, max-age=60"
        return response


def _jpeg_bytes(path, color: tuple[int, int, int]) -> bytes:
    with Image.open(path) as image:
        image.load()
        flat = flatten_on_color(image, color)
    try:
        buffer = BytesIO()
        flat.save(buffer, format="JPEG", quality=95)
        return buffer.getvalue()
    finally:
        flat.close()
