from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Reserved for a future accounts feature.

    Anonymous background removal does not create rows in this table.
    The model exists now so accounts can be added without replacing the
    default user model after the first migration.
    """

    class Meta:
        db_table = "accounts_user"
