from django.urls import path
from . import views as v
urlpatterns = [
    path("referrals/", v.ReferralCreate.as_view()),
    path("referrals/my/", v.ReferralMine.as_view()),
    path("referrals/assigned/", v.ReferralAssigned.as_view()),
    path("referrals/pool/", v.ReferralPool.as_view()),
    path("referrals/monitor/", v.ReferralMonitor.as_view()),
    path("referrals/<uuid:pk>/", v.ReferralDetail.as_view()),
    path("referrals/<uuid:pk>/claim/", v.ReferralClaim.as_view()),
    path("referrals/<uuid:pk>/assign/", v.ReferralAssign.as_view()),
    path("referrals/<uuid:pk>/status/", v.ReferralStatus.as_view()),
    path("referrals/<uuid:pk>/messages/", v.ReferralMessages.as_view()),
]
