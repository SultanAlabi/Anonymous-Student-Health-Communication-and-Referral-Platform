from django.conf import settings
from django.db import models

class Notification(models.Model):
    """In-app notification. Titles are generic by design: never put health content in here."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=40)
    title = models.CharField(max_length=160)
    target_type = models.CharField(max_length=40, blank=True)  # lets the frontend route, e.g. "concern"
    target_id = models.CharField(max_length=64, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read"])]
