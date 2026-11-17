from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    actor_id = serializers.UUIDField(read_only=True)
    class Meta:
        model = AuditLog
        fields = ["id", "actor_id", "action", "target_type", "target_id", "ip_address", "metadata", "created_at"]
from django.core.validators import RegexValidator
from .models import EmergencyContact

class EmergencyPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ["id", "name", "category", "phone", "address", "description", "hours"]

class EmergencyAdminSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(max_length=30, validators=[RegexValidator(r"^[+0-9][0-9 ()\-]{2,29}$", "Enter a valid phone number.")])
    class Meta:
        model = EmergencyContact
        fields = ["id", "name", "category", "phone", "address", "description", "hours", "display_order",
                  "is_active", "is_verified", "verified_at", "updated_at"]
        read_only_fields = ["id", "is_verified", "verified_at", "updated_at"]

    KEY_FIELDS = ("name", "category", "phone", "address", "hours")
    def update(self, inst, data):
        if any(f in data and data[f] != getattr(inst, f) for f in self.KEY_FIELDS):
            inst.is_verified, inst.verified_by, inst.verified_at = False, None, None  # must be re-verified
        return super().update(inst, data)
