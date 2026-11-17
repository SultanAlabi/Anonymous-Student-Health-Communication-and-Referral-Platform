from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.views import APIView
from accounts.models import User
from core.models import AuditLog, EmergencyContact
from core.testutils import Base

E, AE = "/api/v1/emergency-contacts/", "/api/v1/admin/emergency-contacts/"
DATA = {"name": "University Health Centre", "category": "health_centre", "phone": "+234 800 000 0000", "hours": "24/7"}

class EmergencyTests(Base):
    def admin(self):
        self.login(self.make("admin", "admin@example.com"))

    def test_public_shows_only_verified_active_with_disclaimer_and_ignores_bad_token(self):
        EmergencyContact.objects.create(**DATA, is_verified=True)
        EmergencyContact.objects.create(**{**DATA, "name": "Unverified"})
        EmergencyContact.objects.create(**{**DATA, "name": "Inactive"}, is_verified=True, is_active=False)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer garbage-or-expired")
        r = self.client.get(E)
        self.assertEqual(r.status_code, 200)
        self.assertEqual([c["name"] for c in r.data["contacts"]], ["University Health Centre"])
        self.assertIn("not a replacement for emergency medical services", r.data["disclaimer"])
        self.assertNotIn("is_verified", r.data["contacts"][0])

    def test_never_throttled(self):
        for _ in range(40):
            self.assertEqual(self.client.get(E).status_code, 200)

    def test_verification_lifecycle(self):
        self.admin()
        r = self.client.post(AE, {**DATA, "is_verified": True}, format="json")
        self.assertEqual(r.status_code, 201); cid = r.data["id"]
        self.assertFalse(r.data["is_verified"])                       # cannot self-declare verified
        self.assertEqual(self.client.get(E).data["contacts"], [])
        self.assertEqual(self.client.post(f"{AE}{cid}/verify/").status_code, 200)
        self.assertEqual(len(self.client.get(E).data["contacts"]), 1)
        self.assertEqual(self.client.get(f"{E}{cid}/").status_code, 200)
        self.client.patch(f"{AE}{cid}/", {"display_order": 5}, format="json")
        self.assertTrue(EmergencyContact.objects.get().is_verified)    # cosmetic change keeps verification
        self.client.patch(f"{AE}{cid}/", {"phone": "+234 800 111 1111"}, format="json")
        self.assertFalse(EmergencyContact.objects.get().is_verified)   # key change must be re-verified
        self.assertEqual(self.client.get(E).data["contacts"], [])
        self.client.post(f"{AE}{cid}/verify/")
        self.assertEqual(self.client.delete(f"{AE}{cid}/").status_code, 204)
        self.assertEqual(self.client.get(f"{E}{cid}/").status_code, 404)
        self.assertEqual(self.client.get(AE).data["count"], 1)         # still kept for admins
        actions = set(AuditLog.objects.values_list("action", flat=True))
        self.assertTrue({"emergency.create", "emergency.verify", "emergency.update", "emergency.deactivate"} <= actions)

    def test_validation_and_roles(self):
        self.admin()
        self.assertEqual(self.client.post(AE, {**DATA, "phone": "call me"}, format="json").status_code, 400)
        for role in ("student", "ambassador", "professional"):
            self.login(self.make(role, f"{role}@example.com"))
            self.assertEqual(self.client.get(AE).status_code, 403, role)
            self.assertEqual(self.client.post(AE, DATA, format="json").status_code, 403, role)

class DashboardTests(Base):
    def test_admin_only_aggregates(self):
        self.make("student", "s@example.com"); self.make("ambassador", "a@example.com")
        self.login(self.make("admin", "adm@example.com"))
        r = self.client.get("/api/v1/admin/dashboard/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["users"]["by_role"]["student"], 1)
        self.assertEqual(set(r.data), {"users", "resources", "referrals", "appointments", "anonymous_cases",
                                       "confidential_concerns", "emergency_contacts"})
        for role in ("student", "ambassador", "professional"):
            self.login(self.make(role, f"{role}2@example.com"))
            self.assertEqual(self.client.get("/api/v1/admin/dashboard/").status_code, 403, role)

class PublicEndpointAllowlist(Base):
    """Fails if anyone adds an unauthenticated endpoint by accident."""
    EXPECTED_PUBLIC = {"Register", "Login", "Refresh", "HealthCheck", "AnonymousSubmit", "AnonymousAccess",
                       "AnonymousFollowUp", "EmergencyList", "EmergencyDetail", "ResourceListCreate", "ResourceDetail", "ResourceFileDownload"}
    def views(self, patterns):
        for p in patterns:
            if isinstance(p, URLResolver):
                yield from self.views(p.url_patterns)
            elif isinstance(p, URLPattern) and getattr(p.callback, "cls", None):
                yield p.callback.cls
    def test_only_expected_endpoints_are_public(self):
        public = set()
        for cls in self.views(get_resolver().url_patterns):
            perms = list(getattr(cls, "permission_classes", []))
            if (not perms or any(p.__name__ == "AllowAny" for p in perms)
                    or cls.get_permissions is not APIView.get_permissions):
                public.add(cls.__name__)
        self.assertEqual(public, self.EXPECTED_PUBLIC)
