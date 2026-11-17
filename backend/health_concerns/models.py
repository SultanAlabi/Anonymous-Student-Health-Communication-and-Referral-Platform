import uuid
from django.conf import settings
from django.db import models
from core.categories import CONCERN_CHOICES

User = settings.AUTH_USER_MODEL

class Status(models.TextChoices):
    OPEN = "open"
    IN_REVIEW = "in_review"
    RESPONDED = "responded"
    CLOSED = "closed"

class AnonymousCase(models.Model):
    """ANONYMITY: deliberately has NO link to any student. The only user link is the
    professional who claimed the case. Only a keyed hash of the reference code is stored."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code_hash = models.CharField(max_length=64, unique=True)
    category = models.CharField(max_length=30, choices=CONCERN_CHOICES)
    subject = models.CharField(max_length=120)
    description = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN, db_index=True)
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class AnonymousMessage(models.Model):
    case = models.ForeignKey(AnonymousCase, on_delete=models.CASCADE, related_name="messages")
    from_professional = models.BooleanField()
    author = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")  # professional only
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["created_at"]

class ConfidentialConcern(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="concerns")
    category = models.CharField(max_length=30, choices=CONCERN_CHOICES)
    subject = models.CharField(max_length=120)
    description = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN, db_index=True)
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ["-created_at"]
