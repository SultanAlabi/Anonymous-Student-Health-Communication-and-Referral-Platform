from django.urls import path
from . import views
urlpatterns = [
    path("health/", views.HealthCheck.as_view()),
    path("admin/audit-logs/", views.AuditLogList.as_view()),
     path("admin/dashboard/", views.AdminDashboard.as_view()),
    path("admin/emergency-contacts/", views.EmergencyAdminList.as_view()),
    path("admin/emergency-contacts/<int:pk>/", views.EmergencyAdminDetail.as_view()),
    path("admin/emergency-contacts/<int:pk>/verify/", views.EmergencyVerify.as_view()),
    path("emergency-contacts/", views.EmergencyList.as_view()),
    path("emergency-contacts/<int:pk>/", views.EmergencyDetail.as_view()),
]
