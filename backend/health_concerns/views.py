from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from core import audit, roles
from core.permissions import IsProfessional, IsStudent, IsStudentOrProfessional
from . import serializers as s
from .codes import generate_code, hash_code
from .models import AnonymousCase, AnonymousMessage, ConfidentialConcern, Status
from notifications.services import notify

def nostore(resp):
    resp["Cache-Control"] = "no-store"
    return resp

def find_case(code):
    return AnonymousCase.objects.filter(code_hash=hash_code(code)).first()

def invalid():
    return nostore(Response({"detail": "Invalid reference code."}, status=status.HTTP_404_NOT_FOUND))

# ================= anonymous: public endpoints =================
# ANONYMITY: no authentication is read (a stray token is ignored), and nothing is written
# to the audit log (no actor, no IP). Codes travel only in POST bodies.
class AnonPublic(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]

class AnonymousSubmit(AnonPublic):
    throttle_scope = "anon_submit"
    def post(self, request):
        ser = s.AnonymousSubmitSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        for _ in range(5):
            code = generate_code()
            try:
                with transaction.atomic():
                    AnonymousCase.objects.create(code_hash=hash_code(code), **ser.validated_data)
                break
            except IntegrityError:
                continue
        else:
            return Response({"detail": "Please try again."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return nostore(Response({"reference_code": code,
            "message": "Your concern has been submitted. Save this code now: it cannot be recovered."},
            status=status.HTTP_201_CREATED))

class AnonymousAccess(AnonPublic):
    throttle_scope = "anon_code"
    def post(self, request):
        ser = s.CodeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        case = find_case(ser.validated_data["reference_code"])
        if not case:
            return invalid()
        return nostore(Response(s.AnonymousCasePublicSerializer(case, context={"viewer": "anonymous"}).data))

class AnonymousFollowUp(AnonPublic):
    throttle_scope = "anon_code"
    def post(self, request):
        ser = s.FollowUpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        case = find_case(ser.validated_data["reference_code"])
        if not case:
            return invalid()
        if case.status == Status.CLOSED:
            return nostore(Response({"detail": "This case is closed."}, status=status.HTTP_400_BAD_REQUEST))
        AnonymousMessage.objects.create(case=case, from_professional=False, body=ser.validated_data["body"])
        if case.assigned_to:
             notify(case.assigned_to, "anon_followup", "New response on an anonymous case", "anon_case", case.id)
        case.status = Status.IN_REVIEW if case.assigned_to_id else Status.OPEN
        case.save()
        return nostore(Response(s.AnonymousCasePublicSerializer(case, context={"viewer": "anonymous"}).data,
                                status=status.HTTP_201_CREATED))
        

# ================= anonymous: professional endpoints =================
class AnonymousQueue(generics.ListAPIView):
    permission_classes = [IsProfessional]
    serializer_class = s.AnonymousCaseSummarySerializer
    def get_queryset(self):
        return AnonymousCase.objects.filter(assigned_to=None, status=Status.OPEN).order_by("created_at")

class AnonymousAssigned(generics.ListAPIView):
    permission_classes = [IsProfessional]
    serializer_class = s.AnonymousCaseSummarySerializer
    def get_queryset(self):
        return AnonymousCase.objects.filter(assigned_to=self.request.user).order_by("-updated_at")

class AnonymousDetail(generics.RetrieveAPIView):
    permission_classes = [IsProfessional]
    def get_queryset(self):
        return AnonymousCase.objects.filter(assigned_to=self.request.user).prefetch_related("messages")
    def retrieve(self, request, *a, **k):
        case = self.get_object()
        audit.log(request, "anon_case.view", case)
        return Response(s.AnonymousCaseStaffSerializer(case, context={"viewer": "staff"}).data)

class AnonymousClaim(APIView):
    permission_classes = [IsProfessional]
    def post(self, request, pk):
        n = AnonymousCase.objects.filter(pk=pk, assigned_to=None, status=Status.OPEN).update(
            assigned_to=request.user, status=Status.IN_REVIEW)
        if not n:
            return Response({"detail": "Case is not available."}, status=status.HTTP_409_CONFLICT)
        case = AnonymousCase.objects.get(pk=pk)
        audit.log(request, "anon_case.claim", case)
        return Response(s.AnonymousCaseSummarySerializer(case).data)

class AnonymousRespond(APIView):
    permission_classes = [IsProfessional]
    def post(self, request, pk):
        case = get_object_or_404(AnonymousCase, pk=pk, assigned_to=request.user)
        if case.status == Status.CLOSED:
            return Response({"detail": "This case is closed."}, status=status.HTTP_400_BAD_REQUEST)
        ser = s.BodySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        AnonymousMessage.objects.create(case=case, from_professional=True, author=request.user, body=ser.validated_data["body"])
        case.status = Status.RESPONDED
        case.save()
        audit.log(request, "anon_case.respond", case)
        return Response(s.AnonymousCaseStaffSerializer(case, context={"viewer": "staff"}).data, status=status.HTTP_201_CREATED)

# ================= confidential concerns =================
class ConcernCreate(generics.CreateAPIView):
    permission_classes = [IsStudent]
    serializer_class = s.ConcernSerializer
    def perform_create(self, ser):  # identity always comes from the token, never from input
        obj = ser.save(student=self.request.user)
        audit.log(self.request, "concern.create", obj, category=obj.category)

class ConcernMine(generics.ListAPIView):
    permission_classes = [IsStudent]
    serializer_class = s.ConcernSerializer
    def get_queryset(self):
        return ConfidentialConcern.objects.filter(student=self.request.user)

class ConcernQueue(generics.ListAPIView):
    permission_classes = [IsProfessional]
    serializer_class = s.ConcernSummarySerializer
    def get_queryset(self):
        return ConfidentialConcern.objects.filter(assigned_to=None, status=Status.OPEN).order_by("created_at")

class ConcernAssigned(generics.ListAPIView):
    permission_classes = [IsProfessional]
    serializer_class = s.ConcernSummarySerializer
    def get_queryset(self):
        return ConfidentialConcern.objects.filter(assigned_to=self.request.user).order_by("-updated_at")

class ConcernDetail(generics.RetrieveUpdateAPIView):
    http_method_names = ["get", "patch", "head", "options"]
    permission_classes = [IsStudentOrProfessional]
    serializer_class = s.ConcernSerializer
    def get_queryset(self):  # others get 404, so existence is never leaked
        u = self.request.user
        qs = ConfidentialConcern.objects.select_related("student__student_profile")
        return qs.filter(student=u) if u.role == roles.STUDENT else qs.filter(assigned_to=u)
    def retrieve(self, request, *a, **k):
        obj = self.get_object()
        if request.user.role == roles.PROFESSIONAL:
            audit.log(request, "concern.view", obj)
        return Response(self.get_serializer(obj).data)
    def perform_update(self, ser):
        if self.request.user.role != roles.STUDENT or ser.instance.status != Status.OPEN:
            raise PermissionDenied("Only the student can edit, and only before a professional picks it up.")
        ser.save()

class ConcernClaim(APIView):
    permission_classes = [IsProfessional]
    def post(self, request, pk):
        n = ConfidentialConcern.objects.filter(pk=pk, assigned_to=None, status=Status.OPEN).update(
            assigned_to=request.user, status=Status.IN_REVIEW)
        if not n:
            return Response({"detail": "Concern is not available."}, status=status.HTTP_409_CONFLICT)
        obj = ConfidentialConcern.objects.get(pk=pk)
        audit.log(request, "concern.claim", obj)
        notify(obj.student, "concern_assigned", "A healthcare professional has picked up your concern", "concern", obj.id)
        return Response(s.ConcernSummarySerializer(obj).data)
