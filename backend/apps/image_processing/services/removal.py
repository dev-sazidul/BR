"""Run background removal with a hard timeout.

Inference is serialized in-process. A timed-out call may keep running in the
background until the model finishes, because ONNX inference cannot be cancelled
cleanly. The HTTP response still fails and no result file is saved.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeout

from PIL import Image

from apps.image_processing.exceptions import BackgroundRemovalError

from .providers import get_provider

logger = logging.getLogger(__name__)


def prepare_image(image: Image.Image) -> Image.Image:
    if image.mode in {"RGB", "RGBA"}:
        return image
    return image.convert("RGBA")


def remove_background(image: Image.Image, timeout_seconds: int) -> Image.Image:
    provider = get_provider()
    report = provider.status()
    if not report["available"]:
        raise BackgroundRemovalError(report["detail"])

    prepared = prepare_image(image)
    # The worker thread must not share the caller's image buffer.
    clone = prepared.copy()
    executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="solva-removal")
    future = executor.submit(provider.remove, clone)
    timed_out = False
    try:
        try:
            result = future.result(timeout=timeout_seconds)
        except FuturesTimeout as exc:
            timed_out = True
            logger.warning("Background removal exceeded %s seconds", timeout_seconds)
            future.add_done_callback(lambda _future: clone.close())
            raise BackgroundRemovalError(
                "Background removal took too long and was stopped.",
                code="timeout",
            ) from exc
        except BackgroundRemovalError:
            raise
        except Exception as exc:
            logger.exception("Background removal failed")
            raise BackgroundRemovalError("The image could not be processed.") from exc
    finally:
        executor.shutdown(wait=not timed_out, cancel_futures=True)
        if not timed_out:
            clone.close()
        if prepared is not image:
            prepared.close()

    if not isinstance(result, Image.Image):
        raise BackgroundRemovalError("The AI service returned an unexpected result.")
    rgba = result.convert("RGBA")
    if rgba is not result:
        result.close()
    return rgba
