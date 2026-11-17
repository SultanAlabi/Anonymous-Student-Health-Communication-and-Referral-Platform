from .models import Notification

def notify(user, kind, title, target_type="", target_id=""):
    return Notification.objects.create(user=user, kind=kind, title=title,
                                       target_type=target_type, target_id=str(target_id))
