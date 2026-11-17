import os
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from core.categories import RESOURCE_CHOICES

class Resource(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft"
        PUBLISHED = "published"
        ARCHIVED = "archived"
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=RESOURCE_CHOICES, db_index=True)
    summary = models.CharField(max_length=300)
    body = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *a, **k):
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*a, **k)


def upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"resource_files/{timezone.now():%Y/%m}/{uuid.uuid4().hex}{ext}"  # random name on disk


class ResourceFile(models.Model):
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name="files")
    file = models.FileField(upload_to=upload_path, max_length=255)
    original_name = models.CharField(max_length=200)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]