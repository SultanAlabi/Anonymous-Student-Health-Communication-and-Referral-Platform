from core.testutils import Base
from .models import Resource

DATA = {"title": "Coping with exam stress", "category": "mental", "summary": "Tips.", "body": "Sleep, breaks, talk to someone."}

class ResourceTests(Base):
    def test_public_sees_only_published(self):
        pro = self.make("professional", "p@example.com")
        Resource.objects.create(**DATA, author=pro, status="draft")
        Resource.objects.create(**{**DATA, "title": "Live"}, author=pro, status="published")
        r = self.client.get("/api/v1/resources/")
        self.assertEqual([x["title"] for x in r.data["results"]], ["Live"])
        draft = Resource.objects.get(title=DATA["title"])
        self.assertEqual(self.client.get(f"/api/v1/resources/{draft.id}/").status_code, 404)

    def test_student_cannot_create(self):
        self.login(self.make("student", "s@example.com"))
        self.assertEqual(self.client.post("/api/v1/resources/", DATA, format="json").status_code, 403)

    def test_professional_drafts_admin_publishes(self):
        pro = self.make("professional", "p@example.com"); self.login(pro)
        r = self.client.post("/api/v1/resources/", {**DATA, "status": "published"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["status"], "draft")  # professional cannot self-publish
        rid = r.data["id"]
        self.assertEqual(self.client.patch(f"/api/v1/resources/{rid}/", {"title": "Edited"}, format="json").status_code, 200)
        self.login(self.make("admin", "a@example.com"))
        r = self.client.patch(f"/api/v1/resources/{rid}/", {"status": "published"}, format="json")
        self.assertEqual(r.data["status"], "published")
        self.assertIsNotNone(r.data["published_at"])
        self.logout()
        self.assertEqual(self.client.get("/api/v1/resources/").data["count"], 1)

    def test_professional_cannot_edit_others_or_published(self):
        p1, p2 = self.make("professional", "p1@example.com"), self.make("professional", "p2@example.com")
        mine = Resource.objects.create(**DATA, author=p1, status="published")
        theirs = Resource.objects.create(**DATA, author=p2, status="draft")
        self.login(p1)
        self.assertEqual(self.client.patch(f"/api/v1/resources/{mine.id}/", {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.patch(f"/api/v1/resources/{theirs.id}/", {"title": "x"}, format="json").status_code, 404)

    def test_only_admin_archives(self):
        pro = self.make("professional", "p@example.com")
        res = Resource.objects.create(**DATA, author=pro, status="published")
        self.login(pro)
        self.assertEqual(self.client.delete(f"/api/v1/resources/{res.id}/").status_code, 403)
        self.login(self.make("admin", "a@example.com"))
        self.assertEqual(self.client.delete(f"/api/v1/resources/{res.id}/").status_code, 204)
        res.refresh_from_db(); self.assertEqual(res.status, "archived")
        self.assertEqual(self.client.get("/api/v1/resources/").data["count"], 0)
