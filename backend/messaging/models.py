from django.conf import settings
from django.db import models

class Message(models.Model):
    """Asynchronous message inside a confidential concern (student <-> assigned professional)."""
    concern = models.ForeignKey("health_concerns.ConfidentialConcern", on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["concern", "created_at"])]
