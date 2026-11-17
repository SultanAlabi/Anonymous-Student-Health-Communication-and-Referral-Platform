from django.core.cache import cache
from rest_framework.test import APITestCase
from core.models import AuditLog
from .models import User

PW = "Sup3r-Secret-Pass!"
REG = {"email": "stu@example.com", "password": PW, "first_name": "Test", "last_name": "Student",
       "student_number": "TEST/00/0001", "department": "Test Dept", "level": "100"}

class Base(APITestCase):
    def setUp(self):
        cache.clear()
    def make(self, role, email):
        return User.objects.create_user(email, PW, first_name="T", last_name=role, role=role)
    def login(self, user):
        r = self.client.post("/api/v1/auth/login/", {"email": user.email, "password": PW}, format="json")
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
        return r.data

class AuthTests(Base):
    def test_register_forces_student_role(self):
        r = self.client.post("/api/v1/auth/register/", {**REG, "role": "admin"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(User.objects.get(email="stu@example.com").role, "student")
        self.assertNotIn("password", r.data)

    def test_weak_password_rejected(self):
        r = self.client.post("/api/v1/auth/register/", {**REG, "password": "12345678"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("at least 10", " ".join(r.data.get("password", [])))

    def test_common_password_rejected_with_clear_error(self):
        r = self.client.post("/api/v1/auth/register/", {**REG, "password": "password123"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertTrue(any("common" in msg.lower() for msg in r.data.get("password", [])))

    def test_register_accepts_camel_case_fields(self):
        payload = {
            "email": "camel@example.com",
            "password": PW,
            "firstName": "Camel",
            "lastName": "Case",
            "studentNumber": "CASE/00/0001",
            "department": "Test Dept",
            "level": "200",
        }
        r = self.client.post("/api/v1/auth/register/", payload, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(User.objects.get(email="camel@example.com").role, "student")

    def test_login_profile_logout_blacklists(self):
        self.client.post("/api/v1/auth/register/", REG, format="json")
        tokens = self.login(User.objects.get(email=REG["email"]))
        self.assertEqual(self.client.get("/api/v1/auth/profile/").data["student_number"], REG["student_number"])
        self.assertEqual(self.client.post("/api/v1/auth/logout/", {"refresh": tokens["refresh"]}, format="json").status_code, 204)
        r = self.client.post("/api/v1/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_bad_login_and_unauthenticated(self):
        self.make("student", "a@example.com")
        r = self.client.post("/api/v1/auth/login/", {"email": "a@example.com", "password": "nope"}, format="json")
        self.assertEqual(r.status_code, 401)
        self.assertEqual(self.client.get("/api/v1/auth/profile/").status_code, 401)

    def test_login_is_throttled(self):
        for _ in range(10):
            self.client.post("/api/v1/auth/login/", {"email": "x@example.com", "password": "bad"}, format="json")
        r = self.client.post("/api/v1/auth/login/", {"email": "x@example.com", "password": "bad"}, format="json")
        self.assertEqual(r.status_code, 429)

class RBACTests(Base):
    def test_only_admin_reaches_admin_endpoints(self):
        for role in ("student", "ambassador", "professional"):
            self.client.credentials()
            self.login(self.make(role, f"{role}@example.com"))
            self.assertEqual(self.client.get("/api/v1/admin/users/").status_code, 403, role)
            self.assertEqual(self.client.get("/api/v1/admin/audit-logs/").status_code, 403, role)
        self.client.credentials()
        self.login(self.make("admin", "admin@example.com"))
        self.assertEqual(self.client.get("/api/v1/admin/users/").status_code, 200)

    def test_admin_creates_ambassador_and_audit_recorded(self):
        self.login(self.make("admin", "admin@example.com"))
        r = self.client.post("/api/v1/admin/users/", {"email": "amb@example.com", "password": PW,
            "first_name": "A", "last_name": "B", "role": "ambassador"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(User.objects.get(email="amb@example.com").role, "ambassador")
        self.assertTrue(AuditLog.objects.filter(action="admin.user_create").exists())
        logs = self.client.get("/api/v1/admin/audit-logs/").data["results"]
        self.assertTrue(any(l["action"] == "admin.user_create" for l in logs))

    def test_admin_can_deactivate_but_deactivated_cannot_login(self):
        self.login(self.make("admin", "admin@example.com"))
        stu = self.make("student", "s@example.com")
        self.assertEqual(self.client.patch(f"/api/v1/admin/users/{stu.id}/", {"is_active": False}, format="json").status_code, 200)
        self.client.credentials()
        r = self.client.post("/api/v1/auth/login/", {"email": "s@example.com", "password": PW}, format="json")
        self.assertEqual(r.status_code, 401)
