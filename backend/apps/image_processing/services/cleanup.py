"""Delete result files that are older than the retention window."""

import logging
import time
from pathlib import Path

from django.conf import settings

from .storage import results_dir

logger = logging.getLogger(__name__)


def cleanup_expired() -> int:
    directory = Path(settings.MEDIA_ROOT) / "results"
    if not directory.exists():
        return 0

    now = time.time()
    retention = int(settings.IMAGE_RETENTION_MINUTES) * 60
    removed = 0
    root = results_dir().resolve()

    for path in directory.iterdir():
        if not path.is_file():
            continue
        resolved = path.resolve()
        if resolved.parent != root:
            continue
        age = now - path.stat().st_mtime
        stale_part = path.name.endswith(".png.part") and age > 60 * 60
        stale_result = path.suffix == ".png" and not path.name.endswith(".part") and age > retention
        if stale_part or stale_result:
            path.unlink(missing_ok=True)
            removed += 1

    if removed:
        logger.info("Deleted %s expired temporary image file(s).", removed)
    return removed
