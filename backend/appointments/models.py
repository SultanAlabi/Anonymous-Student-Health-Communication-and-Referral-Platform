import uuid
from django.conf import settings
from django.db import models
from core.categories import CONCERN_CHOICES

User = settings.AUTH_USER_MODEL

class Appointment(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested"
        APPROVED = "approved"
        RESCHEDULED = "rescheduled"
        REJECTED = "rejected"
        CANCELLED = "cancelled"
        COMPLETED = "completed"
    class Window(models.TextChoices):
        ANY = "any"
        MORNING = "morning"
        AFTERNOON = "afternoon"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="appointments")
    reason_category = models.CharField(max_length=30, choices=CONCERN_CHOICES)
    reason = models.TextField(blank=True)
    preferred_date = models.DateField(null=True, blank=True)
    preferred_window = models.CharField(max_length=10, choices=Window.choices, default=Window.ANY)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    staff_note = models.CharField(max_length=300, blank=True)  # e.g. location, instructions, reason for rejection
    handled_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-created_at"]
