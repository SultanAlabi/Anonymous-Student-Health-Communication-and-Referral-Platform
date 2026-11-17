from rest_framework.permissions import BasePermission
from . import roles

def has_role(*allowed):
    class RolePermission(BasePermission):
        def has_permission(self, request, view):
            u = request.user
            return bool(u and u.is_authenticated and u.is_active and u.role in allowed)
    return RolePermission

IsStudent = has_role(roles.STUDENT)
IsAmbassador = has_role(roles.AMBASSADOR)
IsProfessional = has_role(roles.PROFESSIONAL)
IsAdminRole = has_role(roles.ADMIN)
IsStaffRole = has_role(roles.AMBASSADOR, roles.PROFESSIONAL, roles.ADMIN)
IsStudentOrProfessional = has_role(roles.STUDENT, roles.PROFESSIONAL)
IsProfessionalOrAdmin = has_role(roles.PROFESSIONAL, roles.ADMIN)