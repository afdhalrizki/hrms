"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

# Import ViewSets
from users.views import UserViewSet
from core.views import DepartmentViewSet, RoleViewSet, GolonganViewSet, EmployeeViewSet, AccessRoleViewSet
from attendance.views import AttendanceViewSet, LeaveRequestViewSet, OvertimeViewSet, ShiftViewSet, ScheduleViewSet
from payroll.views import SalaryComponentViewSet, PayrollPeriodViewSet, PayslipViewSet, PayslipDetailViewSet
from tenants.views import PublicSignupViewSet, RegistrationApprovalViewSet, TenantSettingsAPIView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'golongan', GolonganViewSet)
router.register(r'access-roles', AccessRoleViewSet)
router.register(r'employees', EmployeeViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'leave-requests', LeaveRequestViewSet)
router.register(r'overtime', OvertimeViewSet)
router.register(r'shifts', ShiftViewSet)
router.register(r'schedules', ScheduleViewSet)
router.register(r'salary-components', SalaryComponentViewSet)
router.register(r'payroll-periods', PayrollPeriodViewSet)
router.register(r'payslips', PayslipViewSet)
router.register(r'payslip-details', PayslipDetailViewSet)
router.register(r'public/signup', PublicSignupViewSet, basename='public-signup')
router.register(r'internal/registrations', RegistrationApprovalViewSet, basename='internal-registration')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/tenant/settings/', TenantSettingsAPIView.as_view(), name='tenant-settings'),
    # API Schema & Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
