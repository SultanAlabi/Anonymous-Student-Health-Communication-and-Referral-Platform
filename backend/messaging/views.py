import uuid
from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from core import audit, roles
from core.permissions import IsStudentOrProfessional
from health_concerns.models import Status
from notifications.services import notify
from . import serializers as s
from .models import Message
from .services import accessible_concerns

class MessageListCreate(generics.ListCreateAPIView):
    permission_classes = [IsStudentOrProfessional]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "messages"
    serializer_class = s.MessageSerializer

    def get_queryset(self):
        try:
            cid = uuid.UUID(self.request.query_params.get("concern", ""))
        except ValueError:
            raise ValidationError({"concern": "A valid concern id is required."})
        self.concern = get_object_or_404(accessible_concerns(self.request.user), pk=cid)
        qs = self.concern.messages.select_related("sender")
        if self.request.query_params.get("unread"):
            qs = qs.filter(read_at__isnull=True).exclude(sender=self.request.user)
        return qs

    def list(self, request, *a, **k):
        resp = super().list(request, *a, **k)
        if request.user.role == roles.PROFESSIONAL:
            audit.log(request, "messages.view", self.concern)
        return resp

    def create(self, request, *a, **k):
        ser = s.MessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = request.user
        concern = get_object_or_404(accessible_concerns(user), pk=ser.validated_data["concern"])
        if concern.assigned_to_id is None:
            return Response({"detail": "A healthcare professional has not picked up this concern yet."},
                            status=status.HTTP_400_BAD_REQUEST)
        if concern.status == Status.CLOSED:
            return Response({"detail": "This concern is closed."}, status=status.HTTP_400_BAD_REQUEST)
        msg = Message.objects.create(concern=concern, sender=user, body=ser.validated_data["body"])
        if user.role == roles.PROFESSIONAL:
            concern.status, recipient = Status.RESPONDED, concern.student
        else:
            if concern.status == Status.RESPONDED:
                concern.status = Status.IN_REVIEW
            recipient = concern.assigned_to
        concern.save()
        notify(recipient, "message", "You have a new message", "concern", concern.id)  # no content in notifications
        return Response(s.MessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)

class Conversations(generics.ListAPIView):
    permission_classes = [IsStudentOrProfessional]
    serializer_class = s.ConversationSerializer
    def get_queryset(self):
        u = self.request.user
        return (accessible_concerns(u)
                .annotate(last_message_at=Max("messages__created_at"),
                          unread=Count("messages", filter=Q(messages__read_at__isnull=True) & ~Q(messages__sender=u)))
                .filter(last_message_at__isnull=False).order_by("-last_message_at"))

class MessageDetail(generics.RetrieveAPIView):
    permission_classes = [IsStudentOrProfessional]
    serializer_class = s.MessageSerializer
    def get_queryset(self):
        return Message.objects.filter(concern__in=accessible_concerns(self.request.user)).select_related("sender")
    def retrieve(self, request, *a, **k):
        msg = self.get_object()
        if request.user.role == roles.PROFESSIONAL:
            audit.log(request, "messages.view", msg.concern)
        return Response(self.get_serializer(msg).data)

class MessageRead(APIView):
    permission_classes = [IsStudentOrProfessional]
    def patch(self, request, pk):
        msg = get_object_or_404(Message.objects.filter(concern__in=accessible_concerns(request.user)), pk=pk)
        if msg.sender_id == request.user.id:
            return Response({"detail": "Only the recipient can mark a message as read."}, status=status.HTTP_400_BAD_REQUEST)
        if msg.read_at is None:
            msg.read_at = timezone.now()
            msg.save(update_fields=["read_at"])
        return Response(s.MessageSerializer(msg, context={"request": request}).data)
