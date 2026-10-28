from django.urls import path

from .views import ConfigView, HealthView, RemoveBackgroundView, ResultDownloadView, ResultView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("config/", ConfigView.as_view(), name="config"),
    path("images/remove-background/", RemoveBackgroundView.as_view(), name="remove-background"),
    path("images/results/<str:token>/", ResultView.as_view(), name="result"),
    path("images/results/<str:token>/download/", ResultDownloadView.as_view(), name="result-download"),
]
