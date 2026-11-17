import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from core import roles

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required.")
        extra.setdefault("role", roles.STUDENT)
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)  # Django password hashing
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.update(role=roles.ADMIN, is_staff=True, is_superuser=True)
        return self.create_user(email, password, **extra)

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    role = models.CharField(max_length=20, choices=roles.CHOICES, default=roles.STUDENT, db_index=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # Django admin site only
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    student_number = models.CharField(max_length=30, unique=True)
    department = models.CharField(max_length=120, blank=True)
    level = models.CharField(max_length=10, blank=True)
