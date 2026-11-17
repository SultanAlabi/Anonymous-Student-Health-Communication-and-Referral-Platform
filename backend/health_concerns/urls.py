from django.urls import path
from . import views as v
urlpatterns = [
    path("anonymous-concerns/", v.AnonymousSubmit.as_view()),
    path("anonymous-concerns/access/", v.AnonymousAccess.as_view()),
    path("anonymous-concerns/follow-up/", v.AnonymousFollowUp.as_view()),
    path("anonymous-concerns/queue/", v.AnonymousQueue.as_view()),
    path("anonymous-concerns/assigned/", v.AnonymousAssigned.as_view()),
    path("anonymous-concerns/<uuid:pk>/", v.AnonymousDetail.as_view()),
    path("anonymous-concerns/<uuid:pk>/claim/", v.AnonymousClaim.as_view()),
    path("anonymous-concerns/<uuid:pk>/respond/", v.AnonymousRespond.as_view()),
    path("concerns/", v.ConcernCreate.as_view()),
    path("concerns/my/", v.ConcernMine.as_view()),
    path("concerns/queue/", v.ConcernQueue.as_view()),
    path("concerns/assigned/", v.ConcernAssigned.as_view()),
    path("concerns/<uuid:pk>/", v.ConcernDetail.as_view()),
    path("concerns/<uuid:pk>/claim/", v.ConcernClaim.as_view()),
]
