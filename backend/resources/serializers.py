from rest_framework import serializers
from core import roles
from .files import validate_upload
from .models import Resource, ResourceFile


class ResourceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ["id", "title", "category", "summary", "status", "published_at"]


class ResourceFileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="original_name")
    path = serializers.SerializerMethodField()

    class Meta:
        model = ResourceFile
        fields = ["id", "name", "size", "content_type", "path", "created_at"]

    def get_path(self, o):  # relative to the API root
        return f"resources/{o.resource_id}/files/{o.id}/download/"


class UploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, f):
        try:
            validate_upload(f)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return f


class ResourceSerializer(serializers.ModelSerializer):
    files = ResourceFileSerializer(many=True, read_only=True)

    class Meta:
        model = Resource
        fields = ["id", "title", "category", "summary", "body", "status", "published_at", "created_at", "updated_at", "files"]
        read_only_fields = ["id", "published_at", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()
        req = self.context.get("request")
        if not (req and req.user.is_authenticated and req.user.role == roles.ADMIN):
            fields["status"].read_only = True  # only admins publish/archive (content review)
        return fields