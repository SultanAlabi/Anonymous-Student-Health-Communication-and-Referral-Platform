from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core import audit
from core.permissions import IsAdminRole
from . import serializers as s
from .models import User

class Register(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"
    def post(self, request):
        ser = s.RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        audit.log(request, "auth.register", user, actor=user)
        return Response(s.UserSerializer(user).data, status=status.HTTP_201_CREATED)

class Login(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"
    def post(self, request, *a, **k):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        audit.log(request, "auth.login", ser.user, actor=ser.user)
        return Response(ser.validated_data)

class Refresh(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

class Logout(APIView):
    def post(self, request):
        ser = s.LogoutSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            RefreshToken(ser.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
        audit.log(request, "auth.logout")
        return Response(status=status.HTTP_204_NO_CONTENT)

class Profile(APIView):
    def get(self, request):
        return Response(s.UserSerializer(request.user).data)
    def patch(self, request):
        ser = s.ProfileUpdateSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.update(request.user, ser.validated_data)
        return Response(s.UserSerializer(request.user).data)

class AdminUserList(generics.ListCreateAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = s.AdminUserSerializer
    def get_queryset(self):
        qs = User.objects.order_by("-created_at")
        role = self.request.query_params.get("role")
        return qs.filter(role=role) if role else qs
    def perform_create(self, ser):
        user = ser.save()
        audit.log(self.request, "admin.user_create", user, role=user.role)

class AdminUserDetail(generics.RetrieveUpdateAPIView):  # no delete: deactivate instead
    permission_classes = [IsAdminRole]
    serializer_class = s.AdminUserSerializer
    queryset = User.objects.all()
    def perform_update(self, ser):
        user = ser.save()
        audit.log(self.request, "admin.user_update", user, fields=sorted(ser.validated_data.keys()))
