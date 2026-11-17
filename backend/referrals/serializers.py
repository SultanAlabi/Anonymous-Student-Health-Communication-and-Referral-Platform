from rest_framework import serializers
from core import roles
from core.utils import student_identity
from .models import Referral, ReferralMessage

class _Base(serializers.ModelSerializer):
    assigned_role = serializers.SerializerMethodField()
    def get_assigned_role(self, o):
        return o.assigned_to.role if o.assigned_to_id else None

class ReferralStudentSerializer(_Base):
    class Meta:
        model = Referral
        fields = ["id", "service_type", "urgency", "note", "status", "assigned_role", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "created_at", "updated_at"]
        extra_kwargs = {"note": {"max_length": 500, "required": False}}

class ReferralStaffSerializer(serializers.ModelSerializer):
    """Ambassadors get a first name only; professionals get the identity block."""
    student = serializers.SerializerMethodField()
    class Meta:
        model = Referral
        fields = ["id", "service_type", "urgency", "note", "status", "student", "created_at", "updated_at"]
    def get_student(self, o):
        if self.context["request"].user.role == roles.PROFESSIONAL:
            return student_identity(o.student)
        return {"first_name": o.student.first_name}

class ReferralSummarySerializer(serializers.ModelSerializer):
    student_first_name = serializers.CharField(source="student.first_name", read_only=True)
    class Meta:
        model = Referral
        fields = ["id", "service_type", "urgency", "status", "student_first_name", "created_at"]

class ReferralPoolSerializer(serializers.ModelSerializer):  # no note, no student: just enough to decide to claim
    class Meta:
        model = Referral
        fields = ["id", "service_type", "urgency", "created_at"]

class ReferralAdminSerializer(_Base):  # monitoring metadata only: no note, no student
    class Meta:
        model = Referral
        fields = ["id", "service_type", "urgency", "status", "assigned_to", "assigned_role", "created_at", "updated_at"]

class AssignSerializer(serializers.Serializer):
    assignee = serializers.UUIDField()

class StatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Referral.Status.choices)

class ReferralMessageSerializer(serializers.ModelSerializer):
    sender_role = serializers.CharField(source="sender.role", read_only=True)
    is_mine = serializers.SerializerMethodField()
    class Meta:
        model = ReferralMessage
        fields = ["id", "sender_role", "is_mine", "body", "created_at"]
    def get_is_mine(self, m):
        return m.sender_id == self.context["request"].user.id

class BodySerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000)
