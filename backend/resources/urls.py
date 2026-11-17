from django.urls import path
from . import views
urlpatterns = [
    path("resources/", views.ResourceListCreate.as_view()),
    path("resources/manage/", views.ResourceManageList.as_view()),
    path("resources/<int:pk>/", views.ResourceDetail.as_view()),
]
