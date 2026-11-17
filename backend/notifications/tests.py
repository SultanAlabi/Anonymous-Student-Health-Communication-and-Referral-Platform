from core.testutils import Base
from notifications.models import Notification
from notifications.services import notify

N = "/api/v1/notifications/"

class NotificationTests(Base):
    def test_requires_login(self):
        self.assertEqual(self.client.get(N).status_code, 401)

    def test_only_own_and_mark_read(self):
        a, b = self.make("student", "a@example.com"), self.make("student", "b@example.com")
        na, nb = notify(a, "message", "Hi A"), notify(b, "message", "Hi B")
        self.login(a)
        self.assertEqual(self.client.get(N).data["count"], 1)
        self.assertEqual(self.client.patch(f"{N}{nb.id}/read/").status_code, 404)
        self.assertEqual(self.client.get(N + "unread/").data["count"], 1)
        self.assertTrue(self.client.patch(f"{N}{na.id}/read/").data["is_read"])
        self.assertEqual(self.client.get(N + "unread/").data["count"], 0)

    def test_read_all(self):
        a = self.make("student", "a@example.com")
        for i in range(3):
            notify(a, "message", f"n{i}")
        self.login(a)
        self.assertEqual(self.client.patch(N + "read-all/").data["updated"], 3)
        self.assertFalse(Notification.objects.filter(user=a, is_read=False).exists())

    def test_claim_notifies_student_and_anon_followup_notifies_professional(self):
        stu, pro = self.make("student", "s@example.com"), self.make("professional", "p@example.com")
        self.login(stu)
        cid = self.client.post("/api/v1/concerns/", {"category": "general", "subject": "S", "description": "A long enough text."}, format="json").data["id"]
        self.login(pro); self.client.post(f"/api/v1/concerns/{cid}/claim/")
        self.login(stu)
        self.assertEqual(self.client.get(N).data["results"][0]["kind"], "concern_assigned")
        self.logout()
        code = self.client.post("/api/v1/anonymous-concerns/", {"category": "mental", "subject": "Anon", "description": "An anonymous concern."}, format="json").data["reference_code"]
        from health_concerns.models import AnonymousCase
        case = AnonymousCase.objects.get()
        self.login(pro); self.client.post(f"/api/v1/anonymous-concerns/{case.id}/claim/"); self.logout()
        self.client.post("/api/v1/anonymous-concerns/follow-up/", {"reference_code": code, "body": "More info."}, format="json")
        self.login(pro)
        res = self.client.get(N).data["results"]
        self.assertEqual(res[0]["kind"], "anon_followup")
        self.assertNotIn("More info", str(res))
