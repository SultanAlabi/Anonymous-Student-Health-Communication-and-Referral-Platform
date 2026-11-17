from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from core import audit, roles
from core.permissions import IsAdminRole, IsProfessional, IsStudent, IsStudentOrProfessional
from notifications.services import notify
from . import serializers as s
from .models import Appointment

A = Appointment.Status
PRO_NEXT = {A.REQUESTED: {A.APPROVED, A.REJECTED}, A.APPROVED: {A.RESCHEDULED, A.COMPLETED, A.CANCELLED},
            A.RESCHEDULED: {A.RESCHEDULED, A.COMPLETED, A.CANCELLED}}
STUDENT_NEXT = {A.REQUESTED: {A.CANCELLED}, A.APPROVED: {A.CANCELLED}, A.RESCHEDULED: {A.CANCELLED}}

def accessible(user):
    """Students: their own. Professionals (health-centre staff): unclaimed requests plus those they handle."""
    qs = Appointment.objects.select_related("student__student_profile")
    if user.role == roles.STUDENT:
        return qs.filter(student=user)
    if user.role == roles.PROFESSIONAL:
        return qs.filter(Q(handled_by=user) | Q(status=A.REQUESTED, handled_by=None))
    return qs.none()

class AppointmentCreate(generics.CreateAPIView):
    permission_classes = [IsStudent]
    serializer_class = s.AppointmentSerializer
    def perform_create(self, ser):
        obj = ser.save(student=self.request.user)
        audit.log(self.request, "appointment.create", obj)

class AppointmentMine(generics.ListAPIView):
    permission_classes = [IsStudent]
    serializer_class = s.AppointmentSerializer
    def get_queryset(self):
        return accessible(self.request.user)

class AppointmentQueue(generics.ListAPIView):
    permission_classes = [IsProfessional]
    serializer_class = s.AppointmentSummarySerializer  # no reason text until the request is opened
    def get_queryset(self):
        return Appointment.objects.filter(status=A.REQUESTED, handled_by=None).order_by("created_at")

class AppointmentAssigned(generics.ListAPIView):
    permission_classes = [IsProfessional]
    serializer_class = s.AppointmentSummarySerializer
    def get_queryset(self):
        return Appointment.objects.filter(handled_by=self.request.user).order_by("-updated_at")

class AppointmentMonitor(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = s.AppointmentSummarySerializer  # metadata only
    def get_queryset(self):
        qs = Appointment.objects.all()
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st else qs

class AppointmentDetail(generics.RetrieveAPIView):
    permission_classes = [IsStudentOrProfessional]
    serializer_class = s.AppointmentSerializer
    def get_queryset(self):
        return accessible(self.request.user)
    def retrieve(self, request, *a, **k):
        obj = self.get_object()
        if request.user.role == roles.PROFESSIONAL:
            audit.log(request, "appointment.view", obj)
        return Response(self.get_serializer(obj).data)

class AppointmentStatus(APIView):
    permission_classes = [IsStudentOrProfessional]
    def patch(self, request, pk):
        user = request.user
        ap = get_object_or_404(accessible(user), pk=pk)
        ser = s.AppointmentStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d, new = ser.validated_data, ser.validated_data["status"]
        table = STUDENT_NEXT if user.role == roles.STUDENT else PRO_NEXT
        if new not in table.get(ap.status, set()):
            return Response({"detail": f"Cannot change status from {ap.status} to {new}."}, status=status.HTTP_400_BAD_REQUEST)
        if user.role == roles.PROFESSIONAL:
            if new in (A.APPROVED, A.RESCHEDULED):
                when = d.get("scheduled_at")
                if not when or when <= timezone.now():
                    return Response({"scheduled_at": "A future date and time is required."}, status=status.HTTP_400_BAD_REQUEST)
                ap.scheduled_at = when
            if new == A.REJECTED and not d.get("staff_note"):
                return Response({"staff_note": "Please give the student a reason."}, status=status.HTTP_400_BAD_REQUEST)
            if "staff_note" in d:
                ap.staff_note = d["staff_note"]
            if ap.handled_by_id is None:
                ap.handled_by = user
        ap.status = new
        ap.save()
        audit.log(request, "appointment.status", ap, status=new)
        if user.role == roles.PROFESSIONAL:
            notify(ap.student, "appointment_update", "Your appointment request has been updated", "appointment", ap.id)
        elif ap.handled_by_id:
            notify(ap.handled_by, "appointment_update", "An appointment was cancelled by the student", "appointment", ap.id)
        return Response(s.AppointmentSerializer(ap, context={"request": request}).data)
