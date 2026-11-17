from django.urls import path
from . import views as v
urlpatterns = [
    path("messages/", v.MessageListCreate.as_view()),
    path("messages/conversations/", v.Conversations.as_view()),
    path("messages/<int:pk>/", v.MessageDetail.as_view()),
    path("messages/<int:pk>/read/", v.MessageRead.as_view()),
]
