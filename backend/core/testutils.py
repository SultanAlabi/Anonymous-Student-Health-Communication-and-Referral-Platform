from django.core.cache import cache
from rest_framework.test import APITestCase
from accounts.models import User

PW = "Sup3r-Secret-Pass!"

class Base(APITestCase):
    def setUp(self):
        cache.clear()

    def make(self, role, email):
        return User.objects.create_user(email, PW, first_name="T", last_name=role.capitalize(), role=role)

    def login(self, user):
        r = self.client.post("/api/v1/auth/login/", {"email": user.email, "password": PW}, format="json")
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
        return r.data

    def logout(self):
        self.client.credentials()
