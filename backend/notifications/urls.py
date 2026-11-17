from django.urls import path
from . import views
urlpatterns = [
    path("notifications/", views.NotificationList.as_view()),
    path("notifications/unread/", views.UnreadList.as_view()),
    path("notifications/read-all/", views.ReadAll.as_view()),
    path("notifications/<int:pk>/read/", views.MarkRead.as_view()),
]
