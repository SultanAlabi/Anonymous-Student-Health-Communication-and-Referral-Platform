from core.models import AuditLog
from core.testutils import Base
from health_concerns.models import ConfidentialConcern

CONF = {"category": "general", "subject": "Headaches", "description": "I would like to speak to a professional."}
M, C = "/api/v1/messages/", "/api/v1/concerns/"

class MessagingTests(Base):
    def setup_case(self, claim=True):
        self.stu, self.pro = self.make("student", "s@example.com"), self.make("professional", "p@example.com")
        self.login(self.stu)
        self.cid = self.client.post(C, CONF, format="json").data["id"]
        if claim:
            self.login(self.pro)
            self.client.post(f"{C}{self.cid}/claim/")
        return self.cid

    def send(self, body="Hello there"):
        return self.client.post(M, {"concern": self.cid, "body": body}, format="json")

    def test_cannot_message_before_a_professional_picks_up(self):
        self.setup_case(claim=False)
        self.login(self.stu)
        self.assertEqual(self.send().status_code, 400)

    def test_exchange_updates_status_and_notifies(self):
        self.setup_case()
        r = self.send("Please describe the headaches."); self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data["is_mine"]); self.assertEqual(r.data["sender_role"], "professional")
        self.assertEqual(ConfidentialConcern.objects.get().status, "responded")
        self.login(self.stu)
        self.assertEqual(self.client.get(f"{M}?concern={self.cid}").data["count"], 1)
        self.send("Mostly in the evenings.")
        self.assertEqual(ConfidentialConcern.objects.get().status, "in_review")
        self.login(self.pro)
        kinds = [n["kind"] for n in self.client.get("/api/v1/notifications/").data["results"]]
        self.assertIn("message", kinds)

    def test_notifications_never_contain_message_text(self):
        self.setup_case()
        self.send("SECRET-HEALTH-DETAIL")
        self.login(self.stu)
        self.assertNotIn("SECRET-HEALTH-DETAIL", str(self.client.get("/api/v1/notifications/").data))

    def test_access_control(self):
        self.setup_case(); self.send()
        other = self.make("student", "o@example.com"); self.login(other)
        self.assertEqual(self.client.get(f"{M}?concern={self.cid}").status_code, 404)
        self.assertEqual(self.send().status_code, 404)
        pro2 = self.make("professional", "p2@example.com"); self.login(pro2)
        self.assertEqual(self.client.get(f"{M}?concern={self.cid}").status_code, 404)
        for role in ("ambassador", "admin"):
            self.login(self.make(role, f"{role}@example.com"))
            self.assertEqual(self.client.get(f"{M}?concern={self.cid}").status_code, 403, role)
            self.assertEqual(self.send().status_code, 403, role)

    def test_list_needs_valid_concern_param(self):
        self.setup_case()
        self.assertEqual(self.client.get(M).status_code, 400)
        self.assertEqual(self.client.get(M + "?concern=not-a-uuid").status_code, 400)

    def test_read_receipts_and_unread_counts(self):
        self.setup_case()
        a = self.send("one").data["id"]; self.send("two")
        self.login(self.stu)
        conv = self.client.get(M + "conversations/").data["results"]
        self.assertEqual(conv[0]["unread"], 2)
        self.assertEqual(self.client.patch(f"{M}{a}/read/").status_code, 200)
        self.assertEqual(self.client.get(M + "conversations/").data["results"][0]["unread"], 1)
        self.assertEqual(self.client.get(f"{M}?concern={self.cid}&unread=1").data["count"], 1)
        self.login(self.pro)
        self.assertEqual(self.client.patch(f"{M}{a}/read/").status_code, 400)  # sender can't mark own
        self.assertEqual(self.client.get(M + "conversations/").data["results"][0]["unread"], 0)

    def test_professional_reads_are_audited(self):
        self.setup_case(); self.send()
        self.client.get(f"{M}?concern={self.cid}")
        self.assertTrue(AuditLog.objects.filter(action="messages.view").exists())

    def test_closed_concern_rejects_messages(self):
        self.setup_case(); ConfidentialConcern.objects.update(status="closed")
        self.assertEqual(self.send().status_code, 400)

    def test_blank_message_rejected(self):
        self.setup_case()
        self.assertEqual(self.send("   ").status_code, 400)
