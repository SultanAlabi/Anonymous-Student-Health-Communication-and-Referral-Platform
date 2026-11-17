from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from core import roles
from .models import StudentProfile, User

class RegisterSerializer(serializers.Serializer):
    """Public registration. Role is NEVER read from input: always student."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    student_number = serializers.CharField(max_length=30)
    department = serializers.CharField(max_length=120, required=False, allow_blank=True)
    level = serializers.CharField(max_length=10, required=False, allow_blank=True)

    _FIELD_ALIASES = {
        "firstName": "first_name",
        "lastName": "last_name",
        "studentNumber": "student_number",
    }

    def to_internal_value(self, data):
        normalized = dict(data)
        for alias, field in self._FIELD_ALIASES.items():
            if alias in normalized and field not in normalized:
                normalized[field] = normalized.pop(alias)
        return super().to_internal_value(normalized)

    def validate_email(self, v):
        v = v.strip().lower()
        if User.objects.filter(email=v).exists():
            raise serializers.ValidationError("Unable to register with this email.")
        return v

    def validate_password(self, value):
        user = User(email=self.initial_data.get("email", ""), first_name=self.initial_data.get("first_name", ""), last_name=self.initial_data.get("last_name", ""))
        try:
            validate_password(value, user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate_student_number(self, v):
        v = v.strip()
        if StudentProfile.objects.filter(student_number=v).exists():
            raise serializers.ValidationError("Unable to register with this student number.")
        return v

    def validate_first_name(self, v):
        return v.strip()

    def validate_last_name(self, v):
        return v.strip()

    @transaction.atomic
    def create(self, d):
        user = User.objects.create_user(d["email"], d["password"], first_name=d["first_name"],
                                        last_name=d["last_name"], role=roles.STUDENT)
        StudentProfile.objects.create(user=user, student_number=d["student_number"],
                                      department=d.get("department", ""), level=d.get("level", ""))
        return user

class UserSerializer(serializers.ModelSerializer):
    student_number = serializers.CharField(source="student_profile.student_number", read_only=True, default=None)
    department = serializers.CharField(source="student_profile.department", read_only=True, default=None)
    level = serializers.CharField(source="student_profile.level", read_only=True, default=None)
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "student_number", "department", "level"]
        read_only_fields = fields

class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=80, required=False)
    last_name = serializers.CharField(max_length=80, required=False)
    department = serializers.CharField(max_length=120, required=False, allow_blank=True)
    level = serializers.CharField(max_length=10, required=False, allow_blank=True)

    def update(self, user, d):
        for f in ("first_name", "last_name"):
            if f in d: setattr(user, f, d[f])
        user.save()
        sp = getattr(user, "student_profile", None)
        if sp:
            for f in ("department", "level"):
                if f in d: setattr(sp, f, d[f])
            sp.save()
        return user

class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "is_active", "password", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        if self.instance is None:
            if not attrs.get("password"):
                raise serializers.ValidationError({"password": "Required."})
            validate_password(attrs["password"], User(email=attrs.get("email", "")))
        elif "password" in attrs:
            raise serializers.ValidationError({"password": "Cannot be changed here."})
        return attrs

    def create(self, d):
        return User.objects.create_user(d.pop("email"), d.pop("password"), **d)

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
