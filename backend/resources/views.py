from django.db.models import Q
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from core import audit, roles
from core.permissions import IsAdminRole, IsProfessionalOrAdmin
from . import serializers as s
from .models import Resource

def visible_to(user):
    qs = Resource.objects.all()
    pub = Q(status=Resource.Status.PUBLISHED)
    if user.is_authenticated:
        if user.role == roles.ADMIN:
            return qs
        if user.role == roles.PROFESSIONAL:
            return qs.filter(pub | Q(author=user))
    return qs.filter(pub)

class ResourceListCreate(generics.ListCreateAPIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsProfessionalOrAdmin()]
    def get_serializer_class(self):
        return s.ResourceListSerializer if self.request.method == "GET" else s.ResourceSerializer
    def get_queryset(self):  # public list: published only, for everyone
        qs = Resource.objects.filter(status=Resource.Status.PUBLISHED)
        p = self.request.query_params
        if p.get("category"):
            qs = qs.filter(category=p["category"])
        if p.get("q"):
            qs = qs.filter(Q(title__icontains=p["q"]) | Q(summary__icontains=p["q"]))
        return qs
    def perform_create(self, ser):
        obj = ser.save(author=self.request.user)
        audit.log(self.request, "resource.create", obj, status=obj.status)

class ResourceManageList(generics.ListAPIView):
    """Professionals: their own resources (any status). Admins: all."""
    permission_classes = [IsProfessionalOrAdmin]
    serializer_class = s.ResourceListSerializer
    def get_queryset(self):
        u = self.request.user
        qs = Resource.objects.all() if u.role == roles.ADMIN else Resource.objects.filter(author=u)
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st else qs

class ResourceDetail(generics.RetrieveUpdateDestroyAPIView):
    http_method_names = ["get", "patch", "delete", "head", "options"]
    serializer_class = s.ResourceSerializer
    def get_permissions(self):
        m = self.request.method
        if m in ("GET", "HEAD", "OPTIONS"):
            return [AllowAny()]
        return [IsAdminRole()] if m == "DELETE" else [IsProfessionalOrAdmin()]
    def get_queryset(self):
        return visible_to(self.request.user)
    def perform_update(self, ser):
        u, obj = self.request.user, ser.instance
        if u.role == roles.PROFESSIONAL and (obj.author_id != u.id or obj.status != Resource.Status.DRAFT):
            raise PermissionDenied("You can only edit your own draft resources.")
        obj = ser.save()
        audit.log(self.request, "resource.update", obj, status=obj.status)
    def perform_destroy(self, obj):  # soft delete
        obj.status = Resource.Status.ARCHIVED
        obj.save()
        audit.log(self.request, "resource.archive", obj)
