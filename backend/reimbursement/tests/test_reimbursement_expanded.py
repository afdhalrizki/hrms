from core.tests.base import HRMSTestCase
from rest_framework import status
from core.models import Employee, Department
from reimbursement.models import Reimbursement, ReimbursementCategory
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

class ReimbursementExpandedTestCase(HRMSTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        
        # 1. Setup primary admin for this test first to satisfy "last admin" constraint during cleanup
        self.admin_user = User.objects.get_or_create(
            email='admin_reim@test.com', 
            defaults={'is_staff': True, 'is_active': True}
        )[0]
        if not self.admin_user.pk: self.admin_user.save()
        self.admin_user.tenants.add(self.tenant)

        # 2. Clear leftovers (Employee is isolated, User is shared)
        Employee.objects.all().delete()
        for u in User.objects.filter(tenants=self.tenant).exclude(pk=self.admin_user.pk):
            u.tenants.remove(self.tenant)
        
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'reimbursement']
        self.tenant.save()
        
        self.host = self.domain
        self.dept = Department.objects.create(name="Finance-REIM")
        self.cat = ReimbursementCategory.objects.create(name="Travel-REIM")
        
        self.admin_emp = Employee.objects.create(
            email=self.admin_user.email, fullname="Admin Finance", nik="ADM-REIM",
            department=self.dept, join_date="2024-01-01",
            ktp_number="KTP-REIM-A"
        )
        
        self.staff_user = User.objects.get_or_create(email='staff_reim@test.com', defaults={'is_active': True})[0]
        if not self.staff_user.pk: self.staff_user.save()
        self.staff_user.tenants.add(self.tenant)
        
        self.staff_emp = Employee.objects.create(
            email=self.staff_user.email, fullname="Staff Reim", nik="STF-REIM",
            department=self.dept, join_date="2024-01-01",
            ktp_number="KTP-REIM-S"
        )

    def test_reimbursement_rejection(self):
        """Test the reject action with custom notes."""
        reim = Reimbursement.objects.create(employee=self.staff_emp, category=self.cat, amount=1000, date="2026-04-10")
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('reimbursement-reject', kwargs={'pk': reim.id})
        res = self.client.post(url, {'notes': 'Too expensive'}, format='json', HTTP_HOST=self.host, secure=True)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reim.refresh_from_db()
        self.assertEqual(reim.status, 'REJECTED')
        self.assertEqual(reim.notes, 'Too expensive')

    def test_approval_level_supervisor_only(self):
        """Test final status becoming APPROVED once supervisor approves if level is SUPERVISOR."""
        self.tenant.reimbursement_approval_level = 'SUPERVISOR'
        self.tenant.save()
        
        reim = Reimbursement.objects.create(employee=self.staff_emp, category=self.cat, amount=1000, date="2026-04-10")
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('reimbursement-approve-supervisor', kwargs={'pk': reim.id})
        res = self.client.post(url, HTTP_HOST=self.host, secure=True)
        
        reim.refresh_from_db()
        self.assertEqual(reim.status, 'APPROVED')

    def test_approval_level_hr_only(self):
        """Test final status becoming APPROVED once finance approves if level is HR."""
        self.tenant.reimbursement_approval_level = 'HR'
        self.tenant.save()
        
        reim = Reimbursement.objects.create(employee=self.staff_emp, category=self.cat, amount=1000, date="2026-04-10")
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('reimbursement-approve-finance', kwargs={'pk': reim.id})
        # Test without manual amount adjustment (should fallback to full amount)
        res = self.client.post(url, HTTP_HOST=self.host, secure=True)
        
        reim.refresh_from_db()
        self.assertEqual(reim.status, 'APPROVED')
        self.assertEqual(reim.approved_amount, reim.amount)

    def test_export_csv_no_filters(self):
        """Test export_csv works without month/year query params."""
        Reimbursement.objects.create(employee=self.staff_emp, category=self.cat, amount=1000, status='APPROVED', date="2026-04-10")
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('reimbursement-export-csv')
        res = self.client.get(url, HTTP_HOST=self.host, secure=True)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'text/csv')

    def test_reimbursement_list_unassigned_user_none_fallback(self):
        """Test queryset returns none for unassigned user (ghost user)."""
        ghost_user = User.objects.create_user(email='ghost_reim@test.com', password='pwd')
        ghost_user.tenants.add(self.tenant)
        self.client.force_authenticate(user=ghost_user)
        url = reverse('reimbursement-list')
        res = self.client.get(url, HTTP_HOST=self.host, secure=True)
        # It hits HasTenantRBACPermission which blocks if no employee profile found
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
