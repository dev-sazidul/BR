from django.core.management.base import BaseCommand

from apps.image_processing.services.cleanup import cleanup_expired


class Command(BaseCommand):
    help = "Delete temporary result images older than IMAGE_RETENTION_MINUTES."

    def handle(self, *args, **options):
        removed = cleanup_expired()
        self.stdout.write(self.style.SUCCESS(f"Removed {removed} expired file(s)."))
