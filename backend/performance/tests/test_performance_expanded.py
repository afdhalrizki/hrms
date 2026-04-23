from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from rest_framework import status
from rest_framework.test import APIClient
from core.models import Employee, Department, Role, AccessRole
from performance.models import KPI, KPITarget, Appraisal, AppraisalReview
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied

User = get_user_model()

class PerformanceExpandedTestCase(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.dept = Department.objects.create(name="HR")
        self.kpi = KPI.objects.create(name="Attendance")
        
        self.admin_user = User.objects.create_user(email='admin@com.com', password='pwd', is_staff=True)
        self.admin_emp = Employee.objects.create(
            email='admin@com.com', fullname="Admin Performance", nik="ADM03",
            department=self.dept, join_date="2024-01-01",
            ktp_number="KTP-ADM03"
        )
        self.admin_user.tenants.add(self.tenant)
        
        self.staff_user = User.objects.create_user(email='staff@com.com', password='pwd')
        self.staff_emp = Employee.objects.create(
            email='staff@com.com', fullname="Staff Perf", nik="STF03",
            department=self.dept, join_date="2024-01-01",
            ktp_number="KTP-STF03"
        )
        self.staff_user.tenants.add(self.tenant)

    def test_viewsets_get_queryset_none_fallback(self):
        """Test that list views return empty for users with no employee profile (Coverage for lines 40, 61, 108)."""
        ghost_user = User.objects.create_user(email='ghost@com.com', password='pwd')
        ghost_user.tenants.add(self.tenant)
        self.client.force_authenticate(user=ghost_user)
        
        for url_name in ['kpitarget-list', 'appraisal-list', 'appraisalreview-list']:
            res = self.client.get(reverse(url_name), SERVER_NAME=self.tenant.domains.first().domain)
            # Some might return 403, some might return 200 with empty list
            if res.status_code == 200:
                self.assertEqual(len(res.data), 0)
            else:
                self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_appraisal_review_serializer_permission_denied_manager(self):
        """Test AppraisalReviewSerializer prevents non-supervisors from submitting MANAGER reviews."""
        # Staff is not supervisor of Admin
        appraisal = Appraisal.objects.create(employee=self.admin_emp, period_name="Q1", start_date="2026-01-01", end_date="2026-03-31")
        
        from performance.serializers import AppraisalReviewSerializer
        from unittest.mock import MagicMock
        
        # Mock request context
        request = MagicMock()
        request.user = self.staff_user
        
        data = {
            'appraisal': appraisal.id,
            'reviewer': self.staff_emp.id,
            'reviewer_type': 'MANAGER',
            'comments': 'Bad feedback'
        }
        
        serializer = AppraisalReviewSerializer(data=data, context={'request': request})
        with self.assertRaisesMessage(PermissionDenied, "Only supervisors or performance managers can submit MANAGER reviews."):
            serializer.is_valid(raise_exception=True)

    def test_appraisal_review_serializer_permission_denied_self(self):
        """Test AppraisalReviewSerializer prevents wrong owner from submitting SELF reviews."""
        # Appraisal belongs to Admin, Staff tries to submit SELF review for it
        appraisal = Appraisal.objects.create(employee=self.admin_emp, period_name="Q1", start_date="2026-01-01", end_date="2026-03-31")
        
        from performance.serializers import AppraisalReviewSerializer
        from unittest.mock import MagicMock
        
        request = MagicMock()
        request.user = self.staff_user
        
        data = {
            'appraisal': appraisal.id,
            'reviewer': self.staff_emp.id,
            'reviewer_type': 'SELF',
            'comments': 'I am great'
        }
        
        serializer = AppraisalReviewSerializer(data=data, context={'request': request})
        with self.assertRaisesMessage(PermissionDenied, "SELF reviews must be submitted by the appraisal owner."):
            serializer.is_valid(raise_exception=True)

    def test_appraisal_review_manager_permission_via_rbac(self):
        """Test that MANAGER review is allowed if reviewer has 'manage_performance' permission even if not supervisor."""
        role = AccessRole.objects.create(name="Lead", permissions={'manage_performance': True})
        self.staff_emp.access_role = role
        self.staff_emp.save()
        
        appraisal = Appraisal.objects.create(employee=self.admin_emp, period_name="Q1", start_date="2026-01-01", end_date="2026-03-31")
        
        from performance.serializers import AppraisalReviewSerializer
        from unittest.mock import MagicMock
        
        request = MagicMock()
        request.user = self.staff_user
        
        data = {
            'appraisal': appraisal.id,
            'reviewer': self.staff_emp.id,
            'reviewer_type': 'MANAGER',
            'comments': 'Admin review'
        }
        
        # This should pass validation because of the RBAC check in serializer
        serializer = AppraisalReviewSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())
