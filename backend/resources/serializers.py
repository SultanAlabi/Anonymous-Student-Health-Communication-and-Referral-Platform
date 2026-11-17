from rest_framework import serializers
from core import roles
from .models import Resource

class ResourceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ["id", "title", "category", "summary", "status", "published_at"]

class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ["id", "title", "category", "summary", "body", "status", "published_at", "created_at", "updated_at"]
        read_only_fields = ["id", "published_at", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()
        req = self.context.get("request")
        if not (req and req.user.is_authenticated and req.user.role == roles.ADMIN):
            fields["status"].read_only = True  # only admins publish/archive (content review)
        return fields
