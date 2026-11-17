from django.urls import path
from . import views as v
urlpatterns = [
    path("appointments/", v.AppointmentCreate.as_view()),
    path("appointments/my/", v.AppointmentMine.as_view()),
    path("appointments/queue/", v.AppointmentQueue.as_view()),
    path("appointments/assigned/", v.AppointmentAssigned.as_view()),
    path("appointments/monitor/", v.AppointmentMonitor.as_view()),
    path("appointments/<uuid:pk>/", v.AppointmentDetail.as_view()),
    path("appointments/<uuid:pk>/status/", v.AppointmentStatus.as_view()),
]
