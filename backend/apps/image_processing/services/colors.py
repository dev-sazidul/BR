import re

from PIL import Image

from apps.image_processing.exceptions import ImageValidationError

_HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")


def parse_hex_color(value: str) -> tuple[int, int, int]:
    if not _HEX.fullmatch(value or ""):
        raise ImageValidationError(
            "invalid_color",
            "Background color must be a hex value like #FFFFFF.",
            400,
        )
    number = value[1:]
    return (int(number[0:2], 16), int(number[2:4], 16), int(number[4:6], 16))


def flatten_on_color(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    rgba = image.convert("RGBA")
    flat = Image.new("RGB", rgba.size, color)
    flat.paste(rgba, mask=rgba.getchannel("A"))
    rgba.close()
    return flat
