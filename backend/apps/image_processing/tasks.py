import logging

from celery import shared_task

from .services.cleanup import cleanup_expired

logger = logging.getLogger(__name__)


@shared_task(name="apps.image_processing.tasks.cleanup_expired_results")
def cleanup_expired_results() -> int:
    removed = cleanup_expired()
    logger.info("Celery cleanup removed %s file(s).", removed)
    return removed
