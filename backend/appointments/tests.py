import json
from datetime import timedelta
from django.utils import timezone
from core.models import AuditLog
from core.testutils import Base
from notifications.models import Notification
from .models import Appointment

P = "/api/v1/appointments/"

class AppointmentTests(Base):
    def setUp(self):
        super().setUp()
        self.stu = self.make("student", "s@example.com")
        self.pro = self.make("professional", "p@example.com")
        self.login(self.stu)
        r = self.client.post(P, {"reason_category": "general", "reason": "PRIVATE-REASON", "status": "approved",
                                 "preferred_date": str(timezone.localdate() + timedelta(days=2))}, format="json")
        self.assertEqual(r.status_code, 201)
        self.aid = r.data["id"]
        self.future = (timezone.now() + timedelta(days=3)).isoformat()
    def patch(self, v, **kw):
        return self.client.patch(f"{P}{self.aid}/status/", {"status": v, **kw}, format="json")

    def test_create_validation_and_ignored_fields(self):
        self.assertEqual(Appointment.objects.get().status, "requested")  # injected status ignored
        r = self.client.post(P, {"reason_category": "general", "preferred_date": "2000-01-01"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_queue_hides_reason_and_roles(self):
        self.login(self.pro)
        self.assertNotIn("PRIVATE-REASON", json.dumps(self.client.get(P + "queue/").data))
        d = self.client.get(f"{P}{self.aid}/").data
        self.assertEqual(d["reason"], "PRIVATE-REASON"); self.assertEqual(d["student"]["name"], "T Student")
        self.assertTrue(AuditLog.objects.filter(action="appointment.view").exists())
        for role in ("ambassador", "admin"):
            self.login(self.make(role, f"{role}@example.com"))
            self.assertEqual(self.client.get(P + "queue/").status_code, 403, role)
            self.assertEqual(self.client.get(f"{P}{self.aid}/").status_code, 403, role)
        self.assertNotIn("PRIVATE-REASON", json.dumps(self.client.get(P + "monitor/").data))

    def test_professional_approve_reschedule_complete(self):
        self.login(self.pro)
        self.assertEqual(self.patch("approved").status_code, 400)  # needs a time
        self.assertEqual(self.patch("approved", scheduled_at=(timezone.now() - timedelta(days=1)).isoformat()).status_code, 400)
        r = self.patch("approved", scheduled_at=self.future, staff_note="Room 3, Health Centre")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Appointment.objects.get().handled_by, self.pro)
        self.assertEqual(self.client.get(P + "queue/").data["count"], 0)
        self.assertEqual(self.patch("requested").status_code, 400)
        self.assertEqual(self.patch("rescheduled", scheduled_at=self.future).status_code, 200)
        self.assertEqual(self.patch("completed").status_code, 200)
        self.assertEqual(self.patch("approved", scheduled_at=self.future).status_code, 400)  # finished
        self.login(self.stu)
        self.assertGreaterEqual(Notification.objects.filter(user=self.stu, kind="appointment_update").count(), 3)

    def test_reject_needs_reason(self):
        self.login(self.pro)
        self.assertEqual(self.patch("rejected").status_code, 400)
        self.assertEqual(self.patch("rejected", staff_note="No slots this week; please rebook.").status_code, 200)

    def test_other_professional_locked_out_after_claim(self):
        self.login(self.pro); self.patch("approved", scheduled_at=self.future)
        self.login(self.make("professional", "p2@example.com"))
        self.assertEqual(self.client.get(f"{P}{self.aid}/").status_code, 404)
        self.assertEqual(self.patch("completed").status_code, 404)

    def test_student_isolation_and_cancel_only(self):
        self.assertEqual(self.patch("approved", scheduled_at=self.future).status_code, 400)  # students can't approve
        self.login(self.make("student", "o@example.com"))
        self.assertEqual(self.client.get(f"{P}{self.aid}/").status_code, 404)
        self.assertEqual(self.patch("cancelled").status_code, 404)
        self.login(self.stu)
        self.assertEqual(self.patch("cancelled").status_code, 200)
        self.assertEqual(self.patch("cancelled").status_code, 400)

    def test_student_cancel_notifies_handler(self):
        self.login(self.pro); self.patch("approved", scheduled_at=self.future)
        self.login(self.stu); self.patch("cancelled")
        self.assertTrue(Notification.objects.filter(user=self.pro, kind="appointment_update").exists())
