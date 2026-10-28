from django.conf import settings

from apps.image_processing.exceptions import BackgroundRemovalError

from .base import BackgroundRemovalProvider
from .http import HttpProvider
from .rembg import RembgProvider


def get_provider() -> BackgroundRemovalProvider:
    name = settings.AI_PROVIDER
    if name == "rembg":
        return RembgProvider()
    if name == "http":
        return HttpProvider()
    raise BackgroundRemovalError(f"The AI provider '{name}' is not supported.")
