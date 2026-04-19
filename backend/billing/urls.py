from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BillingViewSet, QuotaReductionRequestViewSet

router = DefaultRouter()
router.register(r'reduction', QuotaReductionRequestViewSet, basename='quota-reduction')
router.register(r'', BillingViewSet, basename='billing')

urlpatterns = [
    path('', include(router.urls)),
]
