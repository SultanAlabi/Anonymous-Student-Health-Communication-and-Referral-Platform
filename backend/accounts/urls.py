from django.urls import path
from . import views
urlpatterns = [
    path("auth/register/", views.Register.as_view()),
    path("auth/login/", views.Login.as_view()),
    path("auth/token/refresh/", views.Refresh.as_view()),
    path("auth/logout/", views.Logout.as_view()),
    path("auth/profile/", views.Profile.as_view()),
    path("admin/users/", views.AdminUserList.as_view()),
    path("admin/users/<uuid:pk>/", views.AdminUserDetail.as_view()),
]
