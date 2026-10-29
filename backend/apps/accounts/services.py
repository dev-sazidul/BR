import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.authtoken.models import Token

from .models import User

logger = logging.getLogger(__name__)


def issue_token(user: User) -> str:
    Token.objects.filter(user=user).delete()
    return Token.objects.create(user=user).key


def send_password_reset(user: User) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_ORIGIN}/reset-password?uid={uid}&token={token}"
    try:
        send_mail(
            subject="Reset your Solva password",
            message=(
                "Use this link to choose a new Solva password. "
                "If you did not ask for a reset, you can ignore this email.\n\n"
                f"{link}\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Password reset email could not be sent")
