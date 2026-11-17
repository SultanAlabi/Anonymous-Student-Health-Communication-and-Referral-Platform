from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User
from core.testutils import PW
from django.test import TestCase
from django.core.cache import cache

B = "/api/v1/"

def api(user=None):
    c = APIClient()
    if user:
        r = c.post(B + "auth/login/", {"email": user.email, "password": PW}, format="json")
        assert r.status_code == 200, r.data
        c.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
    return c

def staff(role):
    return User.objects.create_user(f"{role}@example.com", PW, first_name="T", last_name=role.title(), role=role)

class EndToEnd(TestCase):
    def setUp(self):
        cache.clear()

    def test_main_journeys(self):
        admin, pro, amb = api(staff("admin")), api(staff("professional")), api(staff("ambassador"))
        pro_user = User.objects.get(email="professional@example.com")

        # student registers and logs in
        anon = api()
        self.assertEqual(anon.post(B + "auth/register/", {"email": "stu@example.com", "password": PW, "first_name": "Ada",
            "last_name": "Obi", "student_number": "TEST/1", "department": "Biology", "level": "200"}, format="json").status_code, 201)
        stu = api(User.objects.get(email="stu@example.com"))

        # resources: professional drafts, admin publishes, public reads
        rid = pro.post(B + "resources/", {"title": "Sleep well", "category": "general", "summary": "s", "body": "b"}, format="json").data["id"]
        self.assertEqual(anon.get(B + "resources/").data["count"], 0)
        admin.patch(f"{B}resources/{rid}/", {"status": "published"}, format="json")
        self.assertEqual(anon.get(B + "resources/").data["count"], 1)

        # anonymous concern -> professional responds -> student reads with code
        code = anon.post(B + "anonymous-concerns/", {"category": "mental", "subject": "Stress", "description": "Exams are stressing me."}, format="json").data["reference_code"]
        case_id = pro.get(B + "anonymous-concerns/queue/").data["results"][0]["id"]
        pro.post(f"{B}anonymous-concerns/{case_id}/claim/")
        pro.post(f"{B}anonymous-concerns/{case_id}/respond/", {"body": "Try a routine; see the health centre."}, format="json")
        r = anon.post(B + "anonymous-concerns/access/", {"reference_code": code}, format="json")
        self.assertEqual((r.data["status"], r.data["messages"][0]["sender"]), ("responded", "professional"))

        # confidential concern -> claim -> messages -> notifications
        cid = stu.post(B + "concerns/", {"category": "general", "subject": "Headaches", "description": "Frequent headaches lately."}, format="json").data["id"]
        pro.post(f"{B}concerns/{cid}/claim/")
        self.assertEqual(pro.post(B + "messages/", {"concern": cid, "body": "How long has this gone on?"}, format="json").status_code, 201)
        self.assertEqual(stu.post(B + "messages/", {"concern": cid, "body": "About two weeks."}, format="json").status_code, 201)
        self.assertEqual(stu.get(B + "notifications/unread/").data["count"], 2)  # assigned + new message
        self.assertEqual(stu.patch(B + "notifications/read-all/").data["updated"], 2)

        # referral -> ambassador -> progress to completed
        ref = stu.post(B + "referrals/", {"service_type": "counselling", "note": "Prefer afternoons"}, format="json").data["id"]
        self.assertEqual(amb.get(B + "referrals/pool/").data["count"], 1)
        amb.post(f"{B}referrals/{ref}/claim/")
        for s in ("in_progress", "referred", "completed"):
            self.assertEqual(amb.patch(f"{B}referrals/{ref}/status/", {"status": s}, format="json").status_code, 200)

        # appointment -> professional approves
        apid = stu.post(B + "appointments/", {"reason_category": "general", "reason": "Check-up"}, format="json").data["id"]
        when = (timezone.now() + timedelta(days=2)).isoformat()
        pro.patch(f"{B}appointments/{apid}/status/", {"status": "approved", "scheduled_at": when, "staff_note": "Room 2"}, format="json")
        mine = stu.get(B + "appointments/my/").data["results"][0]
        self.assertEqual((mine["status"], mine["staff_note"]), ("approved", "Room 2"))

        # emergency: admin adds + verifies; anyone sees it with no login
        eid = admin.post(B + "admin/emergency-contacts/", {"name": "Health Centre", "category": "health_centre", "phone": "+234 800 000 0000"}, format="json").data["id"]
        admin.post(f"{B}admin/emergency-contacts/{eid}/verify/")
        self.assertEqual(len(anon.get(B + "emergency-contacts/").data["contacts"]), 1)

        # admin dashboard reflects activity and audit trail exists
        d = admin.get(B + "admin/dashboard/").data
        self.assertEqual(d["referrals"]["completed"], 1)
        self.assertEqual(d["appointments"]["approved"], 1)
        self.assertEqual(d["anonymous_cases"]["responded"], 1)
        self.assertEqual(d["emergency_contacts"]["live"], 1)
        actions = {a["action"] for a in admin.get(B + "admin/audit-logs/").data["results"]}
        self.assertTrue({"auth.login", "anon_case.respond", "referral.status", "emergency.verify"} <= actions)

        # privacy: admin and ambassador cannot read the student's confidential content
        self.assertEqual(admin.get(f"{B}concerns/{cid}/").status_code, 403)
        self.assertEqual(amb.get(f"{B}messages/?concern={cid}").status_code, 403)
        self.assertNotIn(str(pro_user.id), str(anon.post(B + "anonymous-concerns/access/", {"reference_code": code}, format="json").data))
