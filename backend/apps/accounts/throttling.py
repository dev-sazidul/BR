from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class AuthThrottle(SimpleRateThrottle):
    """Limit registration, login, and password changes by client address."""

    scope = "auth"

    def get_rate(self):
        rates = settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {})
        return rates.get(self.scope)

    def get_cache_key(self, request, view):
        if settings.DISABLE_THROTTLING:
            return None
        ident = self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}

    def get_ident(self, request):
        if settings.TRUST_PROXY_HEADERS:
            forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
            if forwarded:
                return forwarded.split(",")[0].strip()
        return super().get_ident(request)
