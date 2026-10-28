"""API errors and the DRF exception handler."""

import logging

from django.core.exceptions import RequestDataTooBig
from rest_framework import status
from rest_framework.exceptions import Throttled, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class APIError(Exception):
    def __init__(self, code: str, message: str, status_code: int):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ImageValidationError(APIError):
    pass


class ResultAccessError(APIError):
    pass


class ResultNotFound(ResultAccessError):
    def __init__(self) -> None:
        super().__init__(
            "result_not_found",
            "This result is unavailable. It may have expired.",
            status.HTTP_404_NOT_FOUND,
        )


class ResultExpired(ResultAccessError):
    def __init__(self) -> None:
        super().__init__(
            "result_expired",
            "This result has expired and is no longer available.",
            status.HTTP_410_GONE,
        )


class BackgroundRemovalError(APIError):
    def __init__(self, message: str, code: str = "ai_unavailable", status_code: int | None = None):
        if status_code is None:
            status_code = (
                status.HTTP_504_GATEWAY_TIMEOUT
                if code == "timeout"
                else status.HTTP_503_SERVICE_UNAVAILABLE
            )
        super().__init__(code, message, status_code)


def error_payload(code: str, message: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or {}}}


def error_response(code: str, message: str, status_code: int, details: dict | None = None) -> Response:
    return Response(error_payload(code, message, details), status=status_code)


def api_exception_handler(exc, context):
    if isinstance(exc, RequestDataTooBig):
        return error_response(
            "file_too_large",
            "That file is larger than the upload limit.",
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )

    if isinstance(exc, APIError):
        return error_response(exc.code, exc.message, exc.status_code)

    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error")
        return error_response(
            "server_error",
            "Something went wrong. Please try again.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = "error"
    message = "The request could not be completed."
    details: dict = {}

    if isinstance(exc, Throttled):
        code = "rate_limited"
        message = "Too many requests. Please wait and try again."
        wait = exc.wait
        details = {"wait_seconds": int(wait) if wait else 0}
    elif isinstance(exc, ValidationError):
        code = "invalid_request"
        message = "The upload could not be read. Choose a PNG, JPG, or WebP image."
        details = {"fields": response.data}
    elif response.status_code == status.HTTP_404_NOT_FOUND:
        code = "not_found"
        message = "That resource was not found."
    elif isinstance(response.data, dict) and "detail" in response.data:
        message = str(response.data["detail"])

    response.data = error_payload(code, message, details)
    return response
