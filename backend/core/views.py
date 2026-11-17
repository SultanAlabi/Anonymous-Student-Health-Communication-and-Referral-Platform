from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from accounts.models import User
from appointments.models import Appointment
from health_concerns.models import AnonymousCase, ConfidentialConcern
from referrals.models import Referral
from resources.models import Resource
from . import audit
from .models import AuditLog, EmergencyContact
from .permissions import IsAdminRole
from .serializers import AuditLogSerializer, EmergencyAdminSerializer, EmergencyPublicSerializer

class HealthCheck(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        return Response({"status": "ok"})

class AuditLogList(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = AuditLogSerializer
    def get_queryset(self):
        qs = AuditLog.objects.all()
        action = self.request.query_params.get("action")
        return qs.filter(action=action) if action else qs

DISCLAIMER = ("This platform is not a replacement for emergency medical services. "
              "If you or someone else is in immediate danger, call the emergency number now.")

def verified_contacts():
    return EmergencyContact.objects.filter(is_active=True, is_verified=True)

class EmergencyList(APIView):
    """Public, no login, no throttling, ignores any token (a stale one must never block emergency info)."""
    authentication_classes = []
    permission_classes = [AllowAny]
    def get(self, request):
        resp = Response({"disclaimer": DISCLAIMER,
                         "contacts": EmergencyPublicSerializer(verified_contacts(), many=True).data})
        resp["Cache-Control"] = "public, max-age=60"
        return resp

class EmergencyDetail(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = EmergencyPublicSerializer
    def get_queryset(self):
        return verified_contacts()

class EmergencyAdminList(generics.ListCreateAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = EmergencyAdminSerializer
    queryset = EmergencyContact.objects.all()
    def perform_create(self, ser):
        obj = ser.save()  # always created unverified
        audit.log(self.request, "emergency.create", obj)

class EmergencyAdminDetail(generics.RetrieveUpdateDestroyAPIView):
    http_method_names = ["get", "patch", "delete", "head", "options"]
    permission_classes = [IsAdminRole]
    serializer_class = EmergencyAdminSerializer
    queryset = EmergencyContact.objects.all()
    def perform_update(self, ser):
        obj = ser.save()
        audit.log(self.request, "emergency.update", obj, verified=obj.is_verified)
    def perform_destroy(self, obj):  # deactivate, never hard delete
        obj.is_active = False
        obj.save()
        audit.log(self.request, "emergency.deactivate", obj)

class EmergencyVerify(APIView):
    permission_classes = [IsAdminRole]
    def post(self, request, pk):
        obj = get_object_or_404(EmergencyContact, pk=pk)
        obj.is_verified, obj.verified_by, obj.verified_at = True, request.user, timezone.now()
        obj.save()
        audit.log(request, "emergency.verify", obj)
        return Response(EmergencyAdminSerializer(obj).data)

def by(model, field):
    return dict(model.objects.order_by().values_list(field).annotate(n=Count("pk")))

class AdminDashboard(APIView):
    """Aggregate counts only. No case content, no identities."""
    permission_classes = [IsAdminRole]
    def get(self, request):
        ec = EmergencyContact.objects
        return Response({
            "users": {"by_role": by(User, "role"), "inactive": User.objects.filter(is_active=False).count()},
            "resources": by(Resource, "status"),
            "referrals": by(Referral, "status"),
            "appointments": by(Appointment, "status"),
            "anonymous_cases": by(AnonymousCase, "status"),
            "confidential_concerns": by(ConfidentialConcern, "status"),
            "emergency_contacts": {"live": verified_contacts().count(),
                                   "awaiting_verification": ec.filter(is_active=True, is_verified=False).count(),
                                   "inactive": ec.filter(is_active=False).count()},
        })
