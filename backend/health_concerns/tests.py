import json
from accounts.models import User
from core.models import AuditLog
from core.testutils import Base
from .codes import hash_code
from .models import AnonymousCase, AnonymousMessage, ConfidentialConcern

ANON = {"category": "mental", "subject": "Exam stress", "description": "I cannot sleep because of exams."}
CONF = {"category": "general", "subject": "Headaches", "description": "I would like to speak to a professional."}
A = "/api/v1/anonymous-concerns/"

class AnonymousTests(Base):
    def submit(self, **kw):
        return self.client.post(A, {**ANON, **kw}, format="json")

    def test_code_format_and_only_hash_stored(self):
        r = self.submit()
        self.assertEqual(r.status_code, 201)
        code = r.data["reference_code"]
        self.assertRegex(code, r"^ASCH(-[A-HJ-NP-Z2-9]{4}){3}$")
        case = AnonymousCase.objects.get()
        self.assertEqual(case.code_hash, hash_code(code))
        self.assertNotEqual(case.code_hash, code)
        self.assertEqual(r["Cache-Control"], "no-store")

    def test_codes_are_unique(self):
        codes = {self.submit().data["reference_code"] for _ in range(5)}
        self.assertEqual(len(codes), 5)

    def test_no_link_to_student_even_when_logged_in(self):
        user_links = lambda m: sorted(f.name for f in m._meta.get_fields() if f.is_relation and f.related_model is User and not f.auto_created)
        self.assertEqual(user_links(AnonymousCase), ["assigned_to"])   # staff link only
        self.assertEqual(user_links(AnonymousMessage), ["author"])     # professional author only
        self.login(self.make("student", "s@example.com"))
        before = AuditLog.objects.count()
        self.assertEqual(self.submit().status_code, 201)
        self.assertEqual(AuditLog.objects.count(), before)             # nothing audited: no actor, no IP
        self.assertIsNone(AnonymousCase.objects.get().assigned_to)

    def test_access_wrong_code_and_normalisation(self):
        code = self.submit().data["reference_code"]
        r = self.client.post(A + "access/", {"reference_code": "ASCH-AAAA-BBBB-CCCC"}, format="json")
        self.assertEqual(r.status_code, 404)
        r = self.client.post(A + "access/", {"reference_code": " " + code.lower().replace("-", " ") + " "}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["subject"], "Exam stress")

    def test_access_is_rate_limited(self):
        for _ in range(30):
            self.client.post(A + "access/", {"reference_code": "ASCH-AAAA-BBBB-CCCC"}, format="json")
        r = self.client.post(A + "access/", {"reference_code": "ASCH-AAAA-BBBB-CCCC"}, format="json")
        self.assertEqual(r.status_code, 429)

    def test_full_flow_and_no_staff_identity_leaks(self):
        code = self.submit().data["reference_code"]
        case = AnonymousCase.objects.get()
        pro = self.make("professional", "p@example.com"); self.login(pro)
        self.assertEqual(self.client.get(A + "queue/").data["count"], 1)
        self.assertEqual(self.client.post(f"{A}{case.id}/claim/").status_code, 200)
        self.assertEqual(self.client.post(f"{A}{case.id}/claim/").status_code, 409)
        self.assertEqual(self.client.get(f"{A}{case.id}/").status_code, 200)
        r = self.client.post(f"{A}{case.id}/respond/", {"body": "Try a sleep routine; the health centre can help."}, format="json")
        self.assertEqual(r.status_code, 201)
        self.logout()
        r = self.client.post(A + "access/", {"reference_code": code}, format="json")
        self.assertEqual(r.data["status"], "responded")
        self.assertEqual(r.data["messages"][0]["sender"], "professional")
        blob = json.dumps(r.data)
        self.assertNotIn(str(pro.id), blob); self.assertNotIn("p@example.com", blob); self.assertNotIn("author", blob)
        r = self.client.post(A + "follow-up/", {"reference_code": code, "body": "Thank you, one more question."}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["status"], "in_review")
        self.assertEqual(r.data["messages"][-1]["sender"], "you")

    def test_staff_endpoints_restricted(self):
        self.submit(); case = AnonymousCase.objects.get()
        for role in ("student", "ambassador", "admin"):  # admin has no access to case content
            self.login(self.make(role, f"{role}@example.com"))
            self.assertEqual(self.client.get(A + "queue/").status_code, 403, role)
            self.assertEqual(self.client.get(f"{A}{case.id}/").status_code, 403, role)
            self.assertEqual(self.client.post(f"{A}{case.id}/claim/").status_code, 403, role)

    def test_other_professional_cannot_read_or_respond(self):
        self.submit(); case = AnonymousCase.objects.get()
        p1, p2 = self.make("professional", "p1@example.com"), self.make("professional", "p2@example.com")
        self.login(p1); self.client.post(f"{A}{case.id}/claim/")
        self.login(p2)
        self.assertEqual(self.client.get(f"{A}{case.id}/").status_code, 404)
        self.assertEqual(self.client.post(f"{A}{case.id}/respond/", {"body": "hi"}, format="json").status_code, 404)

    def test_validation(self):
        self.assertEqual(self.submit(description="short").status_code, 400)
        self.assertEqual(self.submit(category="bogus").status_code, 400)

class ConfidentialTests(Base):
    C = "/api/v1/concerns/"
    def test_identity_from_token_not_input(self):
        s1, s2 = self.make("student", "s1@example.com"), self.make("student", "s2@example.com")
        self.login(s1)
        r = self.client.post(self.C, {**CONF, "student": str(s2.id), "student_id": str(s2.id)}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(ConfidentialConcern.objects.get().student, s1)
        self.assertIsNone(r.data["student"])  # students don't get an identity block

    def test_isolation_between_students_and_roles(self):
        s1, s2 = self.make("student", "s1@example.com"), self.make("student", "s2@example.com")
        self.login(s1); cid = self.client.post(self.C, CONF, format="json").data["id"]
        self.assertEqual(self.client.get(self.C + "my/").data["count"], 1)
        self.login(s2)
        self.assertEqual(self.client.get(f"{self.C}{cid}/").status_code, 404)
        self.assertEqual(self.client.get(self.C + "my/").data["count"], 0)
        for role in ("ambassador", "admin"):
            self.login(self.make(role, f"{role}@example.com"))
            self.assertEqual(self.client.get(f"{self.C}{cid}/").status_code, 403, role)
        self.login(self.make("professional", "p@example.com"))
        self.assertEqual(self.client.get(f"{self.C}{cid}/").status_code, 404)  # not assigned

    def test_professional_claims_views_and_audit(self):
        stu = self.make("student", "s@example.com"); self.login(stu)
        cid = self.client.post(self.C, CONF, format="json").data["id"]
        self.login(self.make("professional", "p@example.com"))
        self.assertEqual(self.client.get(self.C + "queue/").data["count"], 1)
        self.assertNotIn("description", self.client.get(self.C + "queue/").data["results"][0])
        self.assertEqual(self.client.post(f"{self.C}{cid}/claim/").status_code, 200)
        r = self.client.get(f"{self.C}{cid}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["student"]["name"], "T Student")
        self.assertTrue(AuditLog.objects.filter(action="concern.view").exists())
        self.assertEqual(self.client.patch(f"{self.C}{cid}/", {"subject": "x"}, format="json").status_code, 403)

    def test_student_edits_only_while_open(self):
        self.login(self.make("student", "s@example.com"))
        cid = self.client.post(self.C, CONF, format="json").data["id"]
        self.assertEqual(self.client.patch(f"{self.C}{cid}/", {"subject": "Updated"}, format="json").status_code, 200)
        ConfidentialConcern.objects.update(status="in_review")
        self.assertEqual(self.client.patch(f"{self.C}{cid}/", {"subject": "Again"}, format="json").status_code, 403)

    def test_only_students_submit(self):
        for role in ("ambassador", "professional", "admin"):
            self.login(self.make(role, f"{role}@example.com"))
            self.assertEqual(self.client.post(self.C, CONF, format="json").status_code, 403, role)
