import uuid

from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models


class UserManager(DjangoUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email).lower()
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("username", uuid.uuid4().hex)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True or extra_fields.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_staff=True and is_superuser=True.")
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Optional account. Background removal does not create or require one."""

    email = models.EmailField("email address", unique=True)
    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "accounts_user"

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.__class__.objects.normalize_email(self.email).lower()
        if not self.username:
            self.username = uuid.uuid4().hex
        super().save(*args, **kwargs)

    @property
    def name(self) -> str:
        return self.first_name
