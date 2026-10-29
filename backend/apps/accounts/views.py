from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.image_processing.exceptions import error_response

from .models import User
from .serializers import (
    AccountDeleteSerializer,
    AccountSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
)
from .services import issue_token, send_password_reset
from .throttling import AuthThrottle


def _session(user: User, token: str, status_code: int) -> Response:
    return Response({"token": token, "user": AccountSerializer(user).data}, status=status_code)


class RegisterView(APIView):
    serializer_class = RegisterSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    @extend_schema(tags=["Accounts"], summary="Create an account", request=RegisterSerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _session(user, issue_token(user), status.HTTP_201_CREATED)


class LoginView(APIView):
    serializer_class = LoginSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    @extend_schema(tags=["Accounts"], summary="Sign in", request=LoginSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None or not user.is_active:
            return error_response(
                "invalid_credentials",
                "The email or password is incorrect.",
                status.HTTP_401_UNAUTHORIZED,
            )
        return _session(user, issue_token(user), status.HTTP_200_OK)


class LogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthThrottle]

    @extend_schema(tags=["Accounts"], summary="Sign out", request=None)
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    serializer_class = AccountSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Accounts"], summary="Read the signed-in account")
    def get(self, request):
        return Response(AccountSerializer(request.user).data)

    @extend_schema(tags=["Accounts"], summary="Update the signed-in profile", request=AccountSerializer)
    def patch(self, request):
        serializer = AccountSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(tags=["Accounts"], summary="Delete the signed-in account", request=AccountDeleteSerializer)
    def delete(self, request):
        serializer = AccountDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["password"]):
            return error_response(
                "invalid_credentials",
                "The password is incorrect.",
                status.HTTP_400_BAD_REQUEST,
            )
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordChangeView(APIView):
    serializer_class = PasswordChangeSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthThrottle]

    @extend_schema(tags=["Accounts"], summary="Change password", request=PasswordChangeSerializer)
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return _session(request.user, issue_token(request.user), status.HTTP_200_OK)


class PasswordResetView(APIView):
    serializer_class = PasswordResetSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    @extend_schema(tags=["Accounts"], summary="Email a password reset link", request=PasswordResetSerializer)
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data["email"], is_active=True).first()
        if user is not None:
            send_password_reset(user)
        return Response(
            {
                "message": "If an account exists for that email, a reset link is on its way.",
            }
        )


class PasswordResetConfirmView(APIView):
    serializer_class = PasswordResetConfirmSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    @extend_schema(
        tags=["Accounts"],
        summary="Set a new password from a reset link",
        request=PasswordResetConfirmSerializer,
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = _user_from_uid(serializer.validated_data["uid"])
        if user is None or not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return error_response(
                "invalid_token",
                "This reset link is invalid or has expired.",
                status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(serializer.validated_data["password"], user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"password": list(exc.messages)}) from exc
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()
        return Response({"message": "Your password has been updated. Sign in with the new password."})


def _user_from_uid(uid: str) -> User | None:
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        return User.objects.get(pk=user_id, is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return None
