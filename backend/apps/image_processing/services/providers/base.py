"""Provider interface. Adapters return a real RGBA cutout or raise."""

from abc import ABC, abstractmethod

from PIL import Image


class BackgroundRemovalProvider(ABC):
    name: str

    @abstractmethod
    def status(self) -> dict:
        """Return availability details. Must not pretend a missing engine is ready."""

    @abstractmethod
    def remove(self, image: Image.Image) -> Image.Image:
        """Return an RGBA image with the background removed."""
