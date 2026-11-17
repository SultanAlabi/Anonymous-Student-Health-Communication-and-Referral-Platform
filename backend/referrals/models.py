import uuid
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL

class Referral(models.Model):
    class Service(models.TextChoices):
        COUNSELLING = "counselling", "Counselling"
        MENTAL_HEALTH = "mental_health", "Mental health support"
        SEXUAL_HEALTH = "sexual_health", "Sexual & reproductive health clinic"
        MENSTRUAL_HEALTH = "menstrual_health", "Menstrual health"
        GENERAL = "general_checkup", "General check-up"
        OTHER = "other", "Other"
    class Urgency(models.TextChoices):
        ROUTINE = "routine"
        SOON = "soon"
        URGENT = "urgent"
    class Status(models.TextChoices):
        PENDING = "pending"
        ASSIGNED = "assigned"
        IN_PROGRESS = "in_progress"
        REFERRED = "referred"
        COMPLETED = "completed"
        CLOSED = "closed"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="referrals")
    service_type = models.CharField(max_length=20, choices=Service.choices)
    urgency = models.CharField(max_length=10, choices=Urgency.choices, default=Urgency.ROUTINE)
    note = models.TextField(blank=True)  # written by the student, shared with the assignee only
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-created_at"]

class ReferralMessage(models.Model):
    referral = models.ForeignKey(Referral, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="+")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["created_at"]
