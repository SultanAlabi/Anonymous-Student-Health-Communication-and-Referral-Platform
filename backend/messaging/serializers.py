from rest_framework import serializers
from health_concerns.models import ConfidentialConcern
from .models import Message

class MessageCreateSerializer(serializers.Serializer):
    concern = serializers.UUIDField()
    body = serializers.CharField(max_length=5000)  # trims whitespace; blank rejected

class MessageSerializer(serializers.ModelSerializer):
    sender_role = serializers.CharField(source="sender.role", read_only=True)
    is_mine = serializers.SerializerMethodField()
    class Meta:
        model = Message
        fields = ["id", "concern", "sender_role", "is_mine", "body", "created_at", "read_at"]
    def get_is_mine(self, m):
        return m.sender_id == self.context["request"].user.id

class ConversationSerializer(serializers.ModelSerializer):
    last_message_at = serializers.DateTimeField(read_only=True)
    unread = serializers.IntegerField(read_only=True)
    class Meta:
        model = ConfidentialConcern
        fields = ["id", "category", "subject", "status", "last_message_at", "unread"]
