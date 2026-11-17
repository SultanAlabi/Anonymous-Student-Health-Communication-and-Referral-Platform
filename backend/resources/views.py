from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework import status as http
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from core import audit, roles
from core.permissions import IsAdminRole, IsProfessionalOrAdmin
from . import serializers as s
from .files import INLINE, MAX_FILES, TYPES, clean_name, ext_of
from .models import Resource, ResourceFile


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
        return visible_to(self.request.user).prefetch_related("files")

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


# ---------------- file attachments ----------------
def ensure_file_editable(user, res):
    """Admins can manage files on any live resource; professionals only on their own drafts."""
    if user.role == roles.ADMIN and res.status != Resource.Status.ARCHIVED:
        return
    if user.role == roles.PROFESSIONAL and res.author_id == user.id and res.status == Resource.Status.DRAFT:
        return
    raise PermissionDenied("You can only change files on your own draft resources.")


class ResourceFileUpload(APIView):
    permission_classes = [IsProfessionalOrAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        res = get_object_or_404(visible_to(request.user), pk=pk)
        ensure_file_editable(request.user, res)
        if res.files.count() >= MAX_FILES:
            return Response({"detail": f"A resource can have at most {MAX_FILES} files."}, status=http.HTTP_400_BAD_REQUEST)
        ser = s.UploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        f = ser.validated_data["file"]
        obj = ResourceFile.objects.create(resource=res, file=f, original_name=clean_name(f.name),
                                          content_type=TYPES[ext_of(f.name)], size=f.size, uploaded_by=request.user)
        audit.log(request, "resource.file_upload", res, file=obj.id)
        return Response(s.ResourceFileSerializer(obj).data, status=http.HTTP_201_CREATED)


class ResourceFileDelete(APIView):
    permission_classes = [IsProfessionalOrAdmin]

    def delete(self, request, pk, fid):
        res = get_object_or_404(visible_to(request.user), pk=pk)
        ensure_file_editable(request.user, res)
        obj = get_object_or_404(res.files, pk=fid)
        obj.file.delete(save=False)
        obj.delete()
        audit.log(request, "resource.file_delete", res, file=fid)
        return Response(status=http.HTTP_204_NO_CONTENT)


class ResourceFileDownload(APIView):
    """Public for published resources; drafts only for their author and admins. Never served as static media."""
    permission_classes = [AllowAny]

    def get(self, request, pk, fid):
        res = get_object_or_404(visible_to(request.user), pk=pk)
        obj = get_object_or_404(res.files, pk=fid)
        resp = FileResponse(obj.file.open("rb"), content_type=obj.content_type,
                            as_attachment=obj.content_type not in INLINE, filename=obj.original_name)
        resp["X-Content-Type-Options"] = "nosniff"
        resp["Cache-Control"] = "private, max-age=300"
        return resp