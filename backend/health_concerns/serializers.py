from rest_framework import serializers
from core import roles
from core.categories import CONCERN_CHOICES
from .models import AnonymousCase, AnonymousMessage, ConfidentialConcern

# ---- anonymous ----
class AnonymousSubmitSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=CONCERN_CHOICES)
    subject = serializers.CharField(max_length=120)
    description = serializers.CharField(min_length=10, max_length=5000)

class CodeSerializer(serializers.Serializer):
    reference_code = serializers.CharField(max_length=40)

class FollowUpSerializer(CodeSerializer):
    body = serializers.CharField(max_length=5000)

class BodySerializer(serializers.Serializer):
    body = serializers.CharField(max_length=5000)

class AnonymousMessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    class Meta:
        model = AnonymousMessage
        fields = ["sender", "body", "created_at"]  # never exposes the professional's identity
    def get_sender(self, m):
        if m.from_professional:
            return "professional"
        return "you" if self.context.get("viewer") == "anonymous" else "student"

class AnonymousCasePublicSerializer(serializers.ModelSerializer):
    messages = AnonymousMessageSerializer(many=True, read_only=True)
    class Meta:
        model = AnonymousCase
        fields = ["status", "category", "subject", "description", "created_at", "messages"]

class AnonymousCaseStaffSerializer(AnonymousCasePublicSerializer):
    class Meta(AnonymousCasePublicSerializer.Meta):
        fields = ["id"] + AnonymousCasePublicSerializer.Meta.fields

class AnonymousCaseSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = AnonymousCase
        fields = ["id", "category", "subject", "status", "created_at"]

# ---- confidential ----
class ConcernSerializer(serializers.ModelSerializer):
    assigned = serializers.SerializerMethodField()
    student = serializers.SerializerMethodField()
    class Meta:
        model = ConfidentialConcern
        fields = ["id", "category", "subject", "description", "status", "assigned", "student", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "created_at", "updated_at"]
        extra_kwargs = {"description": {"min_length": 10, "max_length": 5000}}
    def get_assigned(self, o):
        return o.assigned_to_id is not None
    def get_student(self, o):  # identity is shown only to the assigned professional
        req = self.context.get("request")
        if req and req.user.is_authenticated and req.user.role == roles.PROFESSIONAL:
            u, sp = o.student, getattr(o.student, "student_profile", None)
            return {"name": f"{u.first_name} {u.last_name}", "student_number": getattr(sp, "student_number", None),
                    "department": getattr(sp, "department", None)}
        return None

class ConcernSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfidentialConcern
        fields = ["id", "category", "subject", "status", "created_at"]
