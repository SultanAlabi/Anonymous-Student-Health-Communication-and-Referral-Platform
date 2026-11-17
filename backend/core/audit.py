from .models import AuditLog

def log(request, action, target=None, actor=None, **metadata):
    user = actor or getattr(request, "user", None)
    if user is not None and not user.is_authenticated:
        user = None
    ip = request.META.get("REMOTE_ADDR") if request else None
    return AuditLog.objects.create(
        actor=user, action=action,
        target_type=type(target).__name__ if target is not None else "",
        target_id=str(target.pk) if target is not None else "",
        ip_address=ip, metadata=metadata)