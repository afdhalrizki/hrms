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
from rest_framework_simplejwt.views import TokenRefreshView

# Import ViewSets
from users.views import UserViewSet, LoginAPIView
from core.views import (
    DepartmentViewSet, RoleViewSet, GolonganViewSet, EmployeeViewSet, 
    AccessRoleViewSet, BranchViewSet, WorkflowConfigViewSet, 
    WorkflowStageViewSet, WorkflowActionViewSet, APIKeyViewSet, AuditLogViewSet,
    DashboardStatsAPIView
)
from attendance.views import (
    AttendanceViewSet, LeaveRequestViewSet, OvertimeViewSet, 
    ShiftViewSet, ScheduleViewSet, AttendanceCorrectionRequestViewSet, LeaveBalanceViewSet
)
from payroll.views import SalaryComponentViewSet, PayrollPeriodViewSet, PayslipViewSet, PayslipDetailViewSet, EmployeeSalaryComponentViewSet
from tenants.views import PublicSignupViewSet, RegistrationApprovalViewSet, TenantSettingsAPIView
from reimbursement.views import ReimbursementViewSet, ReimbursementCategoryViewSet
from performance.views import KPIViewSet, KPITargetViewSet, AppraisalViewSet, AppraisalReviewViewSet
from billing.views import BillingViewSet, QuotaReductionRequestViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'auth', LoginAPIView, basename='auth')
router.register(r'departments', DepartmentViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'golongan', GolonganViewSet)
router.register(r'access-roles', AccessRoleViewSet)
router.register(r'employees', EmployeeViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'attendance-corrections', AttendanceCorrectionRequestViewSet)
router.register(r'leave-requests', LeaveRequestViewSet)
router.register(r'overtime', OvertimeViewSet)
router.register(r'shifts', ShiftViewSet)
router.register(r'schedules', ScheduleViewSet)
router.register(r'leave-balances', LeaveBalanceViewSet)
router.register(r'salary-components', SalaryComponentViewSet)
router.register(r'employee-salary-components', EmployeeSalaryComponentViewSet)
router.register(r'payroll-periods', PayrollPeriodViewSet)
router.register(r'payslips', PayslipViewSet)
router.register(r'payslip-details', PayslipDetailViewSet)
router.register(r'reimbursement-categories', ReimbursementCategoryViewSet)
router.register(r'reimbursements', ReimbursementViewSet)
router.register(r'branches', BranchViewSet)
router.register(r'workflow-configs', WorkflowConfigViewSet)
router.register(r'workflow-stages', WorkflowStageViewSet)
router.register(r'workflow-actions', WorkflowActionViewSet)
router.register(r'api-keys', APIKeyViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'kpis', KPIViewSet)
router.register(r'kpi-targets', KPITargetViewSet)
router.register(r'appraisals', AppraisalViewSet)
router.register(r'appraisal-reviews', AppraisalReviewViewSet)
router.register(r'public/signup', PublicSignupViewSet, basename='public-signup')
router.register(r'internal/registrations', RegistrationApprovalViewSet, basename='internal-registration')
router.register(r'quota-reduction', QuotaReductionRequestViewSet, basename='quota-reduction')
router.register(r'billing', BillingViewSet, basename='billing')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/tenant/settings/', TenantSettingsAPIView.as_view(), name='tenant-settings'),
    path('api/dashboard-stats/', DashboardStatsAPIView.as_view(), name='dashboard-stats'),
    # API Schema & Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
