from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User


@override_settings(
    DISABLE_THROTTLING=True,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_ORIGIN="http://127.0.0.1:5173",
)
class AuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_guest_can_read_public_config_and_not_an_account(self):
        config = self.client.get("/api/v1/config/")
        me = self.client.get("/api/v1/auth/me/")
        self.assertEqual(config.status_code, 200)
        self.assertEqual(me.status_code, 401)

    def test_register_login_profile_and_logout(self):
        created = self.client.post(
            "/api/v1/auth/register/",
            {
                "name": "Ada Lovelace",
                "email": "Ada@Example.com",
                "password": "a-distinct-passphrase",
                "confirm_password": "a-distinct-passphrase",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["user"]["email"], "ada@example.com")
        self.assertEqual(created.json()["user"]["name"], "Ada Lovelace")
        self.assertNotIn("password", created.json()["user"])
        token = created.json()["token"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        me = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["name"], "Ada Lovelace")

        renamed = self.client.patch("/api/v1/auth/me/", {"name": "Ada King"}, format="json")
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.json()["name"], "Ada King")

        logged_out = self.client.post("/api/v1/auth/logout/")
        self.assertEqual(logged_out.status_code, 204)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)

        signed_in = self.client.post(
            "/api/v1/auth/login/",
            {"email": "ada@example.com", "password": "a-distinct-passphrase"},
            format="json",
        )
        self.assertEqual(signed_in.status_code, 200)
        self.assertNotEqual(signed_in.json()["token"], token)

    def test_duplicate_email_and_bad_password_are_clear(self):
        payload = {
            "name": "Ada",
            "email": "ada@example.com",
            "password": "a-distinct-passphrase",
            "confirm_password": "a-distinct-passphrase",
        }
        self.assertEqual(self.client.post("/api/v1/auth/register/", payload, format="json").status_code, 201)
        duplicate = self.client.post("/api/v1/auth/register/", payload, format="json")
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("already exists", duplicate.json()["error"]["message"])

        rejected = self.client.post(
            "/api/v1/auth/login/",
            {"email": "ada@example.com", "password": "wrong-password"},
            format="json",
        )
        self.assertEqual(rejected.status_code, 401)
        self.assertEqual(rejected.json()["error"]["message"], "The email or password is incorrect.")
        self.assertNotIn("a-distinct-passphrase", str(rejected.json()))

    def test_one_user_cannot_read_another_account(self):
        first = self.client.post(
            "/api/v1/auth/register/",
            {
                "name": "First",
                "email": "first@example.com",
                "password": "a-distinct-passphrase",
                "confirm_password": "a-distinct-passphrase",
            },
            format="json",
        )
        second = APIClient()
        other = second.post(
            "/api/v1/auth/register/",
            {
                "name": "Second",
                "email": "second@example.com",
                "password": "another-distinct-passphrase",
                "confirm_password": "another-distinct-passphrase",
            },
            format="json",
        )
        second.credentials(HTTP_AUTHORIZATION=f"Token {other.json()['token']}")
        me = second.get("/api/v1/auth/me/")
        self.assertEqual(me.json()["email"], "second@example.com")
        self.assertNotEqual(me.json()["id"], first.json()["user"]["id"])

    def test_password_change_replaces_the_token(self):
        created = self.client.post(
            "/api/v1/auth/register/",
            {
                "name": "Ada",
                "email": "ada@example.com",
                "password": "a-distinct-passphrase",
                "confirm_password": "a-distinct-passphrase",
            },
            format="json",
        )
        old_token = created.json()["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {old_token}")
        changed = self.client.post(
            "/api/v1/auth/change-password/",
            {
                "current_password": "a-distinct-passphrase",
                "new_password": "a-newer-distinct-passphrase",
                "confirm_password": "a-newer-distinct-passphrase",
            },
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        new_token = changed.json()["token"]
        self.assertNotEqual(new_token, old_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {old_token}")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {new_token}")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)

    def test_password_reset_and_account_deletion(self):
        self.client.post(
            "/api/v1/auth/register/",
            {
                "name": "Ada",
                "email": "ada@example.com",
                "password": "a-distinct-passphrase",
                "confirm_password": "a-distinct-passphrase",
            },
            format="json",
        )
        reset = self.client.post(
            "/api/v1/auth/password-reset/",
            {"email": "ada@example.com"},
            format="json",
        )
        self.assertEqual(reset.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertNotIn("a-distinct-passphrase", mail.outbox[0].body)
        link = mail.outbox[0].body.strip().splitlines()[-1]
        query = link.split("?", 1)[1]
        uid = query.split("&")[0].split("=", 1)[1]
        token = query.split("token=", 1)[1]

        missing = self.client.post(
            "/api/v1/auth/password-reset/",
            {"email": "nobody@example.com"},
            format="json",
        )
        self.assertEqual(missing.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

        confirmed = self.client.post(
            "/api/v1/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "password": "a-reset-distinct-passphrase",
                "confirm_password": "a-reset-distinct-passphrase",
            },
            format="json",
        )
        self.assertEqual(confirmed.status_code, 200)
        signed_in = self.client.post(
            "/api/v1/auth/login/",
            {"email": "ada@example.com", "password": "a-reset-distinct-passphrase"},
            format="json",
        )
        self.assertEqual(signed_in.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {signed_in.json()['token']}")
        deleted = self.client.delete(
            "/api/v1/auth/me/",
            {"password": "a-reset-distinct-passphrase"},
            format="json",
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(User.objects.filter(email="ada@example.com").exists())
