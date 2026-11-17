from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer

class NotificationList(generics.ListAPIView):
    serializer_class = NotificationSerializer
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

class UnreadList(NotificationList):
    def get_queryset(self):
        return super().get_queryset().filter(is_read=False)

class MarkRead(APIView):
    def patch(self, request, pk):
        n = get_object_or_404(Notification, pk=pk, user=request.user)
        if not n.is_read:
            n.is_read = True
            n.save(update_fields=["is_read"])
        return Response(NotificationSerializer(n).data)

class ReadAll(APIView):
    def patch(self, request):
        n = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"updated": n})
