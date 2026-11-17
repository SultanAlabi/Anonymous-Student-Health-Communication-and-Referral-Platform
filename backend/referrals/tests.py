import json
from core.models import AuditLog
from core.testutils import Base
from notifications.models import Notification
from .models import Referral

R = "/api/v1/referrals/"

class ReferralTests(Base):
    def setUp(self):
        super().setUp()
        self.stu = self.make("student", "s@example.com")
        self.stu.last_name = "Lastname"; self.stu.save()
        self.amb = self.make("ambassador", "a@example.com")
        self.login(self.stu)
        self.rid = self.client.post(R, {"service_type": "counselling", "note": "PRIVATE-NOTE"}, format="json").data["id"]

    def test_create_ignores_injected_fields_and_urgent_notice(self):
        other = self.make("student", "o@example.com")
        r = self.client.post(R, {"service_type": "general_checkup", "urgency": "urgent", "student": str(other.id),
                                 "status": "completed", "assigned_to": str(self.amb.id)}, format="json")
        self.assertEqual(r.status_code, 201)
        ref = Referral.objects.get(pk=r.data["id"])
        self.assertEqual((ref.student, ref.status, ref.assigned_to), (self.stu, "pending", None))
        self.assertIn("emergency_notice", r.data)

    def test_pool_is_minimal_and_ambassador_only(self):
        self.login(self.amb)
        row = self.client.get(R + "pool/").data["results"][0]
        self.assertEqual(set(row), {"id", "service_type", "urgency", "created_at"})
        for role in ("student", "professional", "admin"):
            self.login(self.make(role, f"{role}@example.com"))
            self.assertEqual(self.client.get(R + "pool/").status_code, 403, role)

    def test_ambassador_sees_only_necessary_info(self):
        self.login(self.amb)
        self.assertEqual(self.client.post(f"{R}{self.rid}/claim/").status_code, 200)
        self.assertEqual(self.client.post(f"{R}{self.rid}/claim/").status_code, 409)
        r = self.client.get(f"{R}{self.rid}/")
        blob = json.dumps(r.data)
        self.assertIn("PRIVATE-NOTE", blob)
        self.assertEqual(r.data["student"], {"first_name": "T"})
        for leak in ("Lastname", "s@example.com", "student_number", "department"):
            self.assertNotIn(leak, blob)
        self.assertTrue(AuditLog.objects.filter(action="referral.view").exists())
        other = self.make("ambassador", "a2@example.com"); self.login(other)
        self.assertEqual(self.client.get(f"{R}{self.rid}/").status_code, 404)

    def test_admin_sees_metadata_only_and_assigns(self):
        adm = self.make("admin", "adm@example.com"); self.login(adm)
        blob = json.dumps(self.client.get(R + "monitor/").data)
        self.assertNotIn("PRIVATE-NOTE", blob); self.assertNotIn("student", blob)
        self.assertEqual(self.client.get(f"{R}{self.rid}/").status_code, 200)
        self.assertNotIn("PRIVATE-NOTE", json.dumps(self.client.get(f"{R}{self.rid}/").data))
        bad = self.client.post(f"{R}{self.rid}/assign/", {"assignee": str(self.stu.id)}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post(f"{R}{self.rid}/assign/", {"assignee": str(self.amb.id)}, format="json")
        self.assertEqual(ok.data["status"], "assigned")
        self.assertTrue(Notification.objects.filter(user=self.amb, kind="referral_assigned").exists())
        self.assertTrue(Notification.objects.filter(user=self.stu, kind="referral_update").exists())

    def test_status_workflow(self):
        self.login(self.amb); self.client.post(f"{R}{self.rid}/claim/")
        st = lambda v: self.client.patch(f"{R}{self.rid}/status/", {"status": v}, format="json").status_code
        self.assertEqual(st("completed"), 400)          # cannot skip steps
        self.assertEqual((st("in_progress"), st("referred"), st("completed")), (200, 200, 200))
        self.assertEqual(st("pending"), 400)
        self.login(self.stu)
        self.assertGreaterEqual(self.client.get("/api/v1/notifications/").data["count"], 4)

    def test_student_can_only_cancel_pending(self):
        st = lambda v: self.client.patch(f"{R}{self.rid}/status/", {"status": v}, format="json").status_code
        self.assertEqual(st("completed"), 400)
        self.login(self.amb); self.client.post(f"{R}{self.rid}/claim/"); self.login(self.stu)
        self.assertEqual(st("closed"), 400)
        rid2 = self.client.post(R, {"service_type": "other"}, format="json").data["id"]
        self.assertEqual(self.client.patch(f"{R}{rid2}/status/", {"status": "closed"}, format="json").status_code, 200)

    def test_messages_between_student_and_ambassador(self):
        body = {"body": "When are you free?"}
        self.assertEqual(self.client.post(f"{R}{self.rid}/messages/", body, format="json").status_code, 400)  # not assigned
        self.login(self.amb); self.client.post(f"{R}{self.rid}/claim/")
        self.assertEqual(self.client.post(f"{R}{self.rid}/messages/", {"body": "Hello, I will help."}, format="json").status_code, 201)
        self.login(self.stu)
        self.assertEqual(self.client.post(f"{R}{self.rid}/messages/", body, format="json").status_code, 201)
        msgs = self.client.get(f"{R}{self.rid}/messages/").data
        self.assertEqual([m["sender_role"] for m in msgs], ["ambassador", "student"])
        self.login(self.make("student", "x@example.com"))
        self.assertEqual(self.client.get(f"{R}{self.rid}/messages/").status_code, 404)
        self.login(self.make("admin", "adm@example.com"))
        self.assertEqual(self.client.get(f"{R}{self.rid}/messages/").status_code, 404)  # admins aren't participants
        self.login(self.stu)
        Referral.objects.update(status="closed")
        self.assertEqual(self.client.post(f"{R}{self.rid}/messages/", body, format="json").status_code, 400)

    def test_ambassador_cannot_read_confidential_concerns(self):
        cid = self.client.post("/api/v1/concerns/", {"category": "general", "subject": "S", "description": "A long enough text."}, format="json").data["id"]
        self.login(self.amb)
        self.assertEqual(self.client.get(f"/api/v1/concerns/{cid}/").status_code, 403)
