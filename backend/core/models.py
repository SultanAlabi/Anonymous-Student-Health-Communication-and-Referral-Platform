from django.conf import settings
from django.db import models

class AuditLog(models.Model):
    """Append-only record of important actions. Never store health content or PII in metadata."""
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                              on_delete=models.SET_NULL, related_name="+")
    action = models.CharField(max_length=60, db_index=True)
    target_type = models.CharField(max_length=60, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
class EmergencyContact(models.Model):
    """Shown publicly only when active AND verified. Editing key details resets verification."""
    class Category(models.TextChoices):
        EMERGENCY_SERVICES = "emergency_services", "Emergency services"
        HEALTH_CENTRE = "health_centre", "University health centre"
        HOSPITAL = "hospital", "Hospital / emergency facility"
        CRISIS_LINE = "crisis_line", "Crisis / mental health line"
        CAMPUS_SECURITY = "campus_security", "Campus security"
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=Category.choices)
    phone = models.CharField(max_length=30)
    address = models.CharField(max_length=255, blank=True)
    description = models.CharField(max_length=300, blank=True)
    hours = models.CharField(max_length=80, blank=True)
    display_order = models.PositiveSmallIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name"]
