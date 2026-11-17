from django.utils import timezone
from rest_framework import serializers
from core import roles
from core.utils import student_identity
from .models import Appointment

class AppointmentSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    class Meta:
        model = Appointment
        fields = ["id", "reason_category", "reason", "preferred_date", "preferred_window", "status",
                  "scheduled_at", "staff_note", "student", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "scheduled_at", "staff_note", "created_at", "updated_at"]
        extra_kwargs = {"reason": {"max_length": 500, "required": False}}
    def validate_preferred_date(self, v):
        if v and v < timezone.localdate():
            raise serializers.ValidationError("Preferred date cannot be in the past.")
        return v
    def get_student(self, o):
        req = self.context.get("request")
        if req and req.user.role == roles.PROFESSIONAL:
            return student_identity(o.student)
        return None

class AppointmentSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ["id", "reason_category", "preferred_date", "preferred_window", "status", "scheduled_at", "created_at"]

class AppointmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Appointment.Status.choices)
    scheduled_at = serializers.DateTimeField(required=False)
    staff_note = serializers.CharField(max_length=300, required=False, allow_blank=True)
