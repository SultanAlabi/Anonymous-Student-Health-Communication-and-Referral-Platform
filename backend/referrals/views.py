from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from accounts.models import User
from core import audit, roles
from core.permissions import IsAdminRole, IsAmbassador, IsStudent, has_role
from notifications.services import notify
from . import serializers as s
from .models import Referral, ReferralMessage

R = Referral.Status
STAFF_NEXT = {R.ASSIGNED: {R.IN_PROGRESS, R.CLOSED}, R.IN_PROGRESS: {R.REFERRED, R.CLOSED},
              R.REFERRED: {R.COMPLETED, R.CLOSED}, R.COMPLETED: {R.CLOSED}}
STUDENT_NEXT = {R.PENDING: {R.CLOSED}}  # a student can only cancel before anyone has picked it up
ADMIN_NEXT = {**STAFF_NEXT, R.PENDING: {R.CLOSED}}
IsStaffHandler = has_role(roles.AMBASSADOR, roles.PROFESSIONAL)

def referrals_for(user):
    qs = Referral.objects.select_related("student__student_profile", "assigned_to")
    if user.role == roles.STUDENT:
        return qs.filter(student=user)
    if user.role in (roles.AMBASSADOR, roles.PROFESSIONAL):
        return qs.filter(assigned_to=user)
    if user.role == roles.ADMIN:
        return qs
    return qs.none()

def participant_referrals(user):  # admins are not participants in conversations
    return Referral.objects.none() if user.role == roles.ADMIN else referrals_for(user)

class ReferralCreate(generics.CreateAPIView):
    permission_classes = [IsStudent]
    serializer_class = s.ReferralStudentSerializer
    def create(self, request, *a, **k):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save(student=request.user)  # identity from the token only
        audit.log(request, "referral.create", obj, service=obj.service_type)
        data = dict(ser.data)
        if obj.urgency == Referral.Urgency.URGENT:
            data["emergency_notice"] = "If this is an emergency, contact emergency services now. Do not wait for a referral."
        return Response(data, status=status.HTTP_201_CREATED)

class ReferralMine(generics.ListAPIView):
    permission_classes = [IsStudent]
    serializer_class = s.ReferralStudentSerializer
    def get_queryset(self):
        return referrals_for(self.request.user)

class ReferralAssigned(generics.ListAPIView):
    permission_classes = [IsStaffHandler]
    serializer_class = s.ReferralSummarySerializer
    def get_queryset(self):
        return referrals_for(self.request.user).order_by("-updated_at")

class ReferralPool(generics.ListAPIView):
    permission_classes = [IsAmbassador]
    serializer_class = s.ReferralPoolSerializer
    def get_queryset(self):
        return Referral.objects.filter(assigned_to=None, status=R.PENDING).order_by("created_at")

class ReferralClaim(APIView):
    permission_classes = [IsAmbassador]
    def post(self, request, pk):
        n = Referral.objects.filter(pk=pk, assigned_to=None, status=R.PENDING).update(assigned_to=request.user, status=R.ASSIGNED)
        if not n:
            return Response({"detail": "Referral is not available."}, status=status.HTTP_409_CONFLICT)
        obj = Referral.objects.get(pk=pk)
        audit.log(request, "referral.claim", obj)
        notify(obj.student, "referral_update", "Your referral has been picked up", "referral", obj.id)
        return Response(s.ReferralPoolSerializer(obj).data)

class ReferralMonitor(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = s.ReferralAdminSerializer
    def get_queryset(self):
        qs = Referral.objects.select_related("assigned_to")
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st else qs

class ReferralAssign(APIView):
    permission_classes = [IsAdminRole]
    def post(self, request, pk):
        ser = s.AssignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ref = get_object_or_404(Referral, pk=pk)
        if ref.status not in (R.PENDING, R.ASSIGNED):
            return Response({"detail": "Work has already started on this referral."}, status=status.HTTP_400_BAD_REQUEST)
        assignee = User.objects.filter(pk=ser.validated_data["assignee"], is_active=True,
                                       role__in=[roles.AMBASSADOR, roles.PROFESSIONAL]).first()
        if not assignee:
            return Response({"detail": "Assignee must be an active ambassador or professional."}, status=status.HTTP_400_BAD_REQUEST)
        ref.assigned_to, ref.status = assignee, R.ASSIGNED
        ref.save()
        audit.log(request, "referral.assign", ref, assignee=str(assignee.id))
        notify(assignee, "referral_assigned", "You have a new referral assignment", "referral", ref.id)
        notify(ref.student, "referral_update", "Your referral has been assigned", "referral", ref.id)
        return Response(s.ReferralAdminSerializer(ref).data)

class ReferralDetail(generics.RetrieveAPIView):
    def get_queryset(self):
        return referrals_for(self.request.user)
    def get_serializer_class(self):
        role = self.request.user.role
        return {roles.STUDENT: s.ReferralStudentSerializer, roles.ADMIN: s.ReferralAdminSerializer}.get(role, s.ReferralStaffSerializer)
    def retrieve(self, request, *a, **k):
        obj = self.get_object()
        if request.user.role in (roles.AMBASSADOR, roles.PROFESSIONAL):
            audit.log(request, "referral.view", obj)
        return Response(self.get_serializer(obj).data)

class ReferralStatus(APIView):
    def patch(self, request, pk):
        user = request.user
        ref = get_object_or_404(referrals_for(user), pk=pk)
        ser = s.StatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        new = ser.validated_data["status"]
        table = {roles.STUDENT: STUDENT_NEXT, roles.ADMIN: ADMIN_NEXT}.get(user.role, STAFF_NEXT)
        if new not in table.get(ref.status, set()):
            return Response({"detail": f"Cannot change status from {ref.status} to {new}."}, status=status.HTTP_400_BAD_REQUEST)
        ref.status = new
        ref.save()
        audit.log(request, "referral.status", ref, status=new)
        if user.id != ref.student_id:
            notify(ref.student, "referral_update", "Your referral status was updated", "referral", ref.id)
        return Response(s.ReferralAdminSerializer(ref).data if user.role == roles.ADMIN else
                        {"id": str(ref.id), "status": ref.status})

class ReferralMessages(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "messages"
    def get(self, request, pk):
        ref = get_object_or_404(participant_referrals(request.user), pk=pk)
        if request.user.role != roles.STUDENT:
            audit.log(request, "referral.messages_view", ref)
        return Response(s.ReferralMessageSerializer(ref.messages.select_related("sender"), many=True, context={"request": request}).data)
    def post(self, request, pk):
        user = request.user
        ref = get_object_or_404(participant_referrals(user), pk=pk)
        ser = s.BodySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if ref.assigned_to_id is None or ref.status == R.CLOSED:
            return Response({"detail": "Messaging is available once the referral is assigned and until it is closed."},
                            status=status.HTTP_400_BAD_REQUEST)
        msg = ReferralMessage.objects.create(referral=ref, sender=user, body=ser.validated_data["body"])
        notify(ref.assigned_to if user.id == ref.student_id else ref.student, "referral_message",
               "You have a new message about a referral", "referral", ref.id)
        return Response(s.ReferralMessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)
