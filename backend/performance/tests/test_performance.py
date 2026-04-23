from datetime import date
from decimal import Decimal
from django.urls import reverse
from django_tenants.test.cases import FastTenantTestCase as TenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient
from users.models import User
from core.models import Employee, Department
from performance.models import KPI, KPITarget, Appraisal, AppraisalReview


class PerformanceModuleTestCase(TenantTestCase):
    """
    Base setup reused by all Performance test cases.
    Enables 'performance' feature, creates users and employees.
    All model creation must happen INSIDE schema_context to use tenant tables.
    """
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.domain_name = self.tenant.domains.first().domain

        # Enable 'performance' module for this tenant
        self.tenant.plan_type = 'PROFESSIONAL'
        self.tenant.enabled_modules = ['core', 'performance']
        self.tenant.save()

        # ---- All tenant-schema objects go inside schema_context ----
        with schema_context(self.tenant.schema_name):
            self.dept = Department.objects.create(name='Engineering')

            # Admin user (is_staff=True can manage performance)
            self.admin_user = User.objects.create_user(
                email='admin@perf.com', password='password', is_staff=True
            )
            self.admin_user.tenants.add(self.tenant)
            self.admin_emp = Employee.objects.create(
                nik='ADM-001', fullname='Admin User', email='admin@perf.com',
                department=self.dept, join_date=date(2023, 1, 1), ktp_number='000000001'
            )

            # Regular employee
            self.emp_user = User.objects.create_user(
                email='emp@perf.com', password='password'
            )
            self.emp_user.tenants.add(self.tenant)
            self.emp = Employee.objects.create(
                nik='EMP-001', fullname='Regular Employee', email='emp@perf.com',
                department=self.dept, join_date=date(2023, 6, 1), ktp_number='000000002'
            )

            # Second employee (for isolation tests)
            self.emp2_user = User.objects.create_user(
                email='emp2@perf.com', password='password'
            )
            self.emp2_user.tenants.add(self.tenant)
            self.emp2 = Employee.objects.create(
                nik='EMP-002', fullname='Other Employee', email='emp2@perf.com',
                department=self.dept, join_date=date(2023, 6, 1), ktp_number='000000003'
            )

            # Shared KPI (created inside schema_context!)
            self.kpi = KPI.objects.create(
                name='Sales Revenue',
                description='Total monthly sales revenue',
                category='Sales',
                unit=KPI.Unit.CURRENCY
            )


# ============================================================
# 1. Model / String Representation Tests
# ============================================================

class KPIModelTestCase(PerformanceModuleTestCase):

    def test_kpi_str(self):
        """KPI.__str__ should return its name."""
        with schema_context(self.tenant.schema_name):
            self.assertEqual(str(self.kpi), 'Sales Revenue')

    def test_kpi_target_str(self):
        """KPITarget.__str__ should display employee + kpi + period."""
        with schema_context(self.tenant.schema_name):
            target = KPITarget.objects.create(
                employee=self.emp,
                kpi=self.kpi,
                target_value=Decimal('10000000'),
                period=date(2026, 3, 1)
            )
            self.assertIn(self.emp.fullname, str(target))
            self.assertIn(self.kpi.name, str(target))

    def test_appraisal_str(self):
        """Appraisal.__str__ should include employee name and period."""
        with schema_context(self.tenant.schema_name):
            appraisal = Appraisal.objects.create(
                employee=self.emp,
                period_name='Q1 2026',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 3, 31)
            )
            self.assertIn(self.emp.fullname, str(appraisal))
            self.assertIn('Q1 2026', str(appraisal))

    def test_appraisal_review_str(self):
        """AppraisalReview.__str__ should include reviewer type and names."""
        with schema_context(self.tenant.schema_name):
            appraisal = Appraisal.objects.create(
                employee=self.emp,
                period_name='Q1 2026',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 3, 31)
            )
            review = AppraisalReview.objects.create(
                appraisal=appraisal,
                reviewer=self.admin_emp,
                reviewer_type=AppraisalReview.ReviewerType.MANAGER,
                ratings={'score': 4},
                comments='Good work'
            )
            s = str(review)
            self.assertIn('MANAGER', s)
            self.assertIn(self.admin_emp.fullname, s)

    def test_kpi_unit_choices(self):
        """KPI unit choices should include PERCENTAGE, CURRENCY, UNIT."""
        with schema_context(self.tenant.schema_name):
            kpi_pct = KPI.objects.create(name='Attrition Rate', unit=KPI.Unit.PERCENTAGE)
            kpi_cnt = KPI.objects.create(name='Tickets Closed', unit=KPI.Unit.UNIT)
            self.assertEqual(kpi_pct.unit, 'PERCENTAGE')
            self.assertEqual(kpi_cnt.unit, 'UNIT')

    def test_appraisal_default_status_is_draft(self):
        """Appraisal should start DRAFT by default."""
        with schema_context(self.tenant.schema_name):
            appraisal = Appraisal.objects.create(
                employee=self.emp,
                period_name='Q2 2026',
                start_date=date(2026, 4, 1),
                end_date=date(2026, 6, 30)
            )
            self.assertEqual(appraisal.status, Appraisal.Status.DRAFT)

    def test_appraisal_status_can_be_updated(self):
        """Appraisal status should persist when updated."""
        with schema_context(self.tenant.schema_name):
            appraisal = Appraisal.objects.create(
                employee=self.emp,
                period_name='Q2 2026',
                start_date=date(2026, 4, 1),
                end_date=date(2026, 6, 30)
            )
            appraisal.status = Appraisal.Status.SUBMITTED
            appraisal.save()
            appraisal.refresh_from_db()
            self.assertEqual(appraisal.status, 'SUBMITTED')

    def test_kpitarget_actual_value_default_zero(self):
        """KPITarget.actual_value should default to 0."""
        with schema_context(self.tenant.schema_name):
            target = KPITarget.objects.create(
                employee=self.emp, kpi=self.kpi,
                target_value=Decimal('5000000'),
                period=date(2026, 1, 1)
            )
            self.assertEqual(target.actual_value, Decimal('0'))


# ============================================================
# 2. KPI API Tests
# ============================================================

class KPIAPITestCase(PerformanceModuleTestCase):

    def test_admin_can_list_kpis(self):
        """Admin (is_staff=True) should see all KPIs."""
        self.client.force_login(self.admin_user)
        response = self.client.get(reverse('kpi-list'), SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_admin_can_create_kpi(self):
        """Admin should be able to create a new KPI."""
        self.client.force_login(self.admin_user)
        payload = {
            'name': 'Customer Satisfaction',
            'description': 'NPS score',
            'category': 'Customer',
            'unit': 'PERCENTAGE'
        }
        response = self.client.post(
            reverse('kpi-list'), payload, format='json', SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Customer Satisfaction')

    def test_admin_can_update_kpi(self):
        """Admin should be able to PATCH an existing KPI."""
        self.client.force_login(self.admin_user)
        response = self.client.patch(
            reverse('kpi-detail', kwargs={'pk': self.kpi.id}),
            {'description': 'Updated description'},
            format='json',
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], 'Updated description')

    def test_admin_can_delete_kpi(self):
        """Admin should be able to delete a KPI."""
        self.client.force_login(self.admin_user)
        with schema_context(self.tenant.schema_name):
            kpi_to_delete = KPI.objects.create(name='Temp KPI', unit=KPI.Unit.UNIT)
        response = self.client.delete(
            reverse('kpi-detail', kwargs={'pk': kpi_to_delete.id}),
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        with schema_context(self.tenant.schema_name):
            self.assertFalse(KPI.objects.filter(id=kpi_to_delete.id).exists())

    def test_regular_employee_blocked_from_kpi_write(self):
        """Regular employee (non-staff) should be forbidden from creating KPIs."""
        self.client.force_login(self.emp_user)
        payload = {'name': 'Hack KPI', 'unit': 'UNIT'}
        response = self.client.post(
            reverse('kpi-list'), payload, format='json', SERVER_NAME=self.domain_name
        )
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN])

    def test_unauthenticated_cannot_list_kpis(self):
        """Unauthenticated requests should be rejected."""
        response = self.client.get(reverse('kpi-list'), SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_feature_gating_blocks_non_performance_tenant(self):
        """A tenant without 'performance' in enabled_modules should get 403."""
        self.tenant.enabled_modules = ['core']
        self.tenant.save()
        self.client.force_login(self.admin_user)
        response = self.client.get(reverse('kpi-list'), SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Restore
        self.tenant.enabled_modules = ['core', 'performance']
        self.tenant.save()


# ============================================================
# 3. KPITarget API Tests
# ============================================================

class KPITargetAPITestCase(PerformanceModuleTestCase):

    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.my_target = KPITarget.objects.create(
                employee=self.emp,
                kpi=self.kpi,
                target_value=Decimal('15000000'),
                actual_value=Decimal('12000000'),
                period=date(2026, 3, 1)
            )
            self.other_target = KPITarget.objects.create(
                employee=self.emp2,
                kpi=self.kpi,
                target_value=Decimal('10000000'),
                period=date(2026, 3, 1)
            )

    def test_admin_sees_all_targets(self):
        """Admin (is_staff=True) should see all KPI targets."""
        self.client.force_login(self.admin_user)
        response = self.client.get(reverse('kpitarget-list'), SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_employee_sees_only_own_targets(self):
        """Regular employee should only see their own KPI targets."""
        self.client.force_login(self.emp_user)
        response = self.client.get(reverse('kpitarget-list'), SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [t['id'] for t in response.data]
        self.assertIn(self.my_target.id, ids)
        self.assertNotIn(self.other_target.id, ids)

    def test_admin_can_create_target(self):
        """Admin should be able to create a KPI target for any employee."""
        self.client.force_login(self.admin_user)
        payload = {
            'employee': self.emp.id,
            'kpi': self.kpi.id,
            'target_value': '20000000',
            'period': '2026-04-01'
        }
        response = self.client.post(
            reverse('kpitarget-list'), payload, format='json', SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['target_value']), Decimal('20000000'))

    def test_serializer_returns_computed_fields(self):
        """KPITargetSerializer should include kpi_name and employee_name."""
        self.client.force_login(self.admin_user)
        response = self.client.get(
            reverse('kpitarget-detail', kwargs={'pk': self.my_target.id}),
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('kpi_name', response.data)
        self.assertIn('employee_name', response.data)
        self.assertEqual(response.data['kpi_name'], 'Sales Revenue')
        self.assertEqual(response.data['employee_name'], 'Regular Employee')

    def test_admin_can_update_actual_value(self):
        """Admin should be able to update the actual value of a KPI target."""
        self.client.force_login(self.admin_user)
        response = self.client.patch(
            reverse('kpitarget-detail', kwargs={'pk': self.my_target.id}),
            {'actual_value': '14000000'},
            format='json',
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['actual_value']), Decimal('14000000'))

    def test_kpi_target_uniqueness_constraint(self):
        """Verify that duplicate targets for same Emp/KPI/Month are blocked."""
        self.client.force_login(self.admin_user)
        payload = {
            'employee': self.emp.id,
            'kpi': self.kpi.id,
            'target_value': '10000000',
            'period': '2026-03-01' # Already exists in setUp
        }
        response = self.client.post(reverse('kpitarget-list'), payload, format='json', SERVER_NAME=self.domain_name)
        # Unique constraint should trigger 400
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ============================================================
# 4. Appraisal API Tests
# ============================================================

class AppraisalAPITestCase(PerformanceModuleTestCase):

    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.my_appraisal = Appraisal.objects.create(
                employee=self.emp,
                period_name='Q1 2026',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 3, 31)
            )
            self.other_appraisal = Appraisal.objects.create(
                employee=self.emp2,
                period_name='Q1 2026',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 3, 31)
            )

    def test_admin_sees_all_appraisals(self):
        """Admin should see all appraisals."""
        self.client.force_login(self.admin_user)
        response = self.client.get(reverse('appraisal-list'), SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_employee_sees_only_own_appraisals(self):
        """Regular employee should only see their own appraisals."""
        self.client.force_login(self.emp_user)
        response = self.client.get(reverse('appraisal-list'), SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [a['id'] for a in response.data]
        self.assertIn(self.my_appraisal.id, ids)
        self.assertNotIn(self.other_appraisal.id, ids)

    def test_admin_can_create_appraisal(self):
        """Admin should be able to create a new appraisal for any employee."""
        self.client.force_login(self.admin_user)
        payload = {
            'employee': self.emp.id,
            'period_name': 'Q2 2026',
            'start_date': '2026-04-01',
            'end_date': '2026-06-30',
            'status': 'DRAFT'
        }
        response = self.client.post(
            reverse('appraisal-list'), payload, format='json', SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['period_name'], 'Q2 2026')
        self.assertEqual(response.data['status'], 'DRAFT')

    def test_appraisal_full_status_lifecycle(self):
        """Appraisal should transition DRAFT → SUBMITTED → REVIEWED → COMPLETED."""
        self.client.force_login(self.admin_user)
        url = reverse('appraisal-detail', kwargs={'pk': self.my_appraisal.id})
        for new_status in ['SUBMITTED', 'REVIEWED', 'COMPLETED']:
            response = self.client.patch(
                url, {'status': new_status}, format='json', SERVER_NAME=self.domain_name
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK,
                             msg=f"Failed to transition to {new_status}")
            self.assertEqual(response.data['status'], new_status)

    def test_serializer_includes_employee_name_and_reviews(self):
        """AppraisalSerializer should include employee_name and embedded reviews list."""
        self.client.force_login(self.admin_user)
        response = self.client.get(
            reverse('appraisal-detail', kwargs={'pk': self.my_appraisal.id}),
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('employee_name', response.data)
        self.assertIn('reviews', response.data)
        self.assertEqual(response.data['employee_name'], 'Regular Employee')
        self.assertIsInstance(response.data['reviews'], list)

    def test_admin_can_delete_appraisal(self):
        """Admin should be able to delete an appraisal."""
        self.client.force_login(self.admin_user)
        response = self.client.delete(
            reverse('appraisal-detail', kwargs={'pk': self.other_appraisal.id}),
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        with schema_context(self.tenant.schema_name):
            self.assertFalse(Appraisal.objects.filter(id=self.other_appraisal.id).exists())


# ============================================================
# 5. AppraisalReview API Tests
# ============================================================

class AppraisalReviewAPITestCase(PerformanceModuleTestCase):

    def setUp(self):
        super().setUp()
        with schema_context(self.tenant.schema_name):
            self.appraisal = Appraisal.objects.create(
                employee=self.emp,
                period_name='Annual 2026',
                start_date=date(2026, 1, 1),
                end_date=date(2026, 12, 31),
                status=Appraisal.Status.SUBMITTED
            )
            # Admin (manager) reviews the employee
            self.review = AppraisalReview.objects.create(
                appraisal=self.appraisal,
                reviewer=self.admin_emp,
                reviewer_type=AppraisalReview.ReviewerType.MANAGER,
                ratings={'technical': 4, 'communication': 5},
                comments='Excellent year.'
            )

    def test_admin_sees_all_reviews(self):
        """Admin should see all appraisal reviews."""
        self.client.force_login(self.admin_user)
        response = self.client.get(
            reverse('appraisalreview-list'), SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_employee_cannot_see_incomplete_appraisal_reviews(self):
        """
        An employee should NOT see their own reviews until appraisal is COMPLETED.
        With SUBMITTED status, emp is not the reviewer → list should be empty.
        """
        self.client.force_login(self.emp_user)
        response = self.client.get(
            reverse('appraisalreview-list'), SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # emp is NOT the reviewer, and appraisal is SUBMITTED not COMPLETED
        ids = [r['id'] for r in response.data]
        self.assertNotIn(self.review.id, ids)

    def test_employee_can_see_completed_appraisal_reviews(self):
        """Employee should be able to see reviews of their OWN COMPLETED appraisal."""
        with schema_context(self.tenant.schema_name):
            self.appraisal.status = Appraisal.Status.COMPLETED
            self.appraisal.save()

        self.client.force_login(self.emp_user)
        response = self.client.get(
            reverse('appraisalreview-list'), SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data]
        self.assertIn(self.review.id, ids)

    def test_admin_can_create_review(self):
        """Admin should be able to create an appraisal review with ratings JSON."""
        self.client.force_login(self.admin_user)
        payload = {
            'appraisal': self.appraisal.id,
            'reviewer': self.admin_emp.id,
            'reviewer_type': 'SELF',
            'ratings': {'leadership': 3, 'teamwork': 4},
            'comments': 'Good progress'
        }
        response = self.client.post(
            reverse('appraisalreview-list'), payload, format='json',
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('reviewer_name', response.data)
        self.assertEqual(response.data['ratings']['leadership'], 3)

    def test_admin_can_update_review_comments(self):
        """Admin should be able to update review comments via PATCH."""
        self.client.force_login(self.admin_user)
        response = self.client.patch(
            reverse('appraisalreview-detail', kwargs={'pk': self.review.id}),
            {'comments': 'Revised comments'},
            format='json',
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['comments'], 'Revised comments')

    def test_ratings_json_field_stored_correctly(self):
        """Ratings JSONField should be stored and retrieved as a dict."""
        self.client.force_login(self.admin_user)
        response = self.client.get(
            reverse('appraisalreview-detail', kwargs={'pk': self.review.id}),
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data['ratings'], dict)
        self.assertEqual(response.data['ratings']['technical'], 4)
        self.assertEqual(response.data['ratings']['communication'], 5)

    def test_reviewer_name_included_in_serializer(self):
        """AppraisalReviewSerializer should include reviewer_name read-only field."""
        self.client.force_login(self.admin_user)
        response = self.client.get(
            reverse('appraisalreview-detail', kwargs={'pk': self.review.id}),
            SERVER_NAME=self.domain_name
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('reviewer_name', response.data)
        self.assertEqual(response.data['reviewer_name'], 'Admin User')

    def test_manager_review_permission_supervisor_success(self):
        """Verify that a direct supervisor can submit a MANAGER review."""
        with schema_context(self.tenant.schema_name):
            # Set emp2 as supervisor of emp
            self.emp.supervisor = self.emp2
            self.emp.save()
        
        self.client.force_login(self.emp2_user)
        payload = {
            'appraisal': self.appraisal.id,
            'reviewer': self.emp2.id,
            'reviewer_type': 'MANAGER',
            'ratings': {'score': 5},
            'comments': 'Supervisor review'
        }
        response = self.client.post(reverse('appraisalreview-list'), payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_self_review_permission_owner_success(self):
        """Verify that an employee can submit a SELF review for their own appraisal."""
        self.client.force_login(self.emp_user)
        payload = {
            'appraisal': self.appraisal.id,
            'reviewer': self.emp.id,
            'reviewer_type': 'SELF',
            'ratings': {'score': 4},
            'comments': 'My self review'
        }
        response = self.client.post(reverse('appraisalreview-list'), payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_self_review_permission_wrong_owner_failure(self):
        """Verify that an employee CANNOT submit a SELF review for someone else's appraisal."""
        self.client.force_login(self.emp2_user)
        payload = {
            'appraisal': self.appraisal.id,
            'reviewer': self.emp2.id,
            'reviewer_type': 'SELF',
            'ratings': {'score': 4},
            'comments': 'Hack review'
        }
        response = self.client.post(reverse('appraisalreview-list'), payload, format='json', SERVER_NAME=self.domain_name)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
