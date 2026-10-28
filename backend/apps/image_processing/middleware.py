"""Convert request-size failures into the API error shape."""

from django.core.exceptions import RequestDataTooBig
from django.http import JsonResponse

from .exceptions import error_payload


class ApiErrorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        if not isinstance(exception, RequestDataTooBig):
            return None
        if not request.path.startswith("/api/"):
            return None
        return JsonResponse(
            error_payload(
                "file_too_large",
                "That file is larger than the upload limit.",
                {},
            ),
            status=413,
        )
