from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/", include("core.urls")),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("health_concerns.urls")),
    path("api/v1/", include("messaging.urls")),
    path("api/v1/", include("notifications.urls")),
    path("api/v1/", include("resources.urls")),
    path("api/v1/", include("referrals.urls")),
    path("api/v1/", include("appointments.urls")),
]
