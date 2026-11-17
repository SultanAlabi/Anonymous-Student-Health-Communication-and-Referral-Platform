from core import roles
from health_concerns.models import ConfidentialConcern

def accessible_concerns(user):
    """Only the owning student and the assigned professional take part. Nobody else, admins included."""
    qs = ConfidentialConcern.objects.all()
    if user.role == roles.STUDENT:
        return qs.filter(student=user)
    if user.role == roles.PROFESSIONAL:
        return qs.filter(assigned_to=user)
    return qs.none()
