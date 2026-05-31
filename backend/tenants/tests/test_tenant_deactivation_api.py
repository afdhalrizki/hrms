import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from users.global_constants import ROLE_SUPERADMIN, ROLE_SUPPORT
from tenants.models import Tenant

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture(autouse=True)
def setup_public_tenant(db):
    tenant, _ = Tenant.objects.get_or_create(schema_name='public', defaults={'name': 'HariKerja Platform'})
    from django.db import connection
    connection.set_tenant(tenant)
    return tenant

@pytest.fixture
def superadmin_user(db):
    return User.objects.create_user(
        email="super@harikerja.com", 
        password="password123", 
        global_role=ROLE_SUPERADMIN
    )

@pytest.fixture
def support_user(db):
    return User.objects.create_user(
        email="support@harikerja.com", 
        password="password123", 
        global_role=ROLE_SUPPORT
    )

@pytest.fixture
def target_tenant(db):
    from django_tenants.utils import schema_context
    with schema_context('public'):
        tenant = Tenant.objects.create(
            schema_name='target_co', 
            name='Target Company',
            subscription_status='ACTIVE'
        )
    return tenant

@pytest.mark.django_db
class TestTenantDeactivationAPI:
    def test_list_tenants_returns_status_and_plan(self, api_client, superadmin_user, target_tenant):
        api_client.force_authenticate(user=superadmin_user)
        response = api_client.get('/api/internal/tenants/')
        assert response.status_code == status.HTTP_200_OK
        
        # Check that target company details are listed with status and plan
        tenant_data = [t for t in response.data if t['schema_name'] == 'target_co'][0]
        assert tenant_data['name'] == 'Target Company'
        assert tenant_data['subscription_status'] == 'ACTIVE'
        assert tenant_data['plan_type'] == 'FREE' # default free plan

    def test_toggle_active_suspends_active_tenant(self, api_client, superadmin_user, target_tenant):
        api_client.force_authenticate(user=superadmin_user)
        assert target_tenant.subscription_status == 'ACTIVE'

        # Suspend tenant
        response = api_client.post(f'/api/internal/tenants/{target_tenant.id}/toggle-active/')
        assert response.status_code == status.HTTP_200_OK
        assert "suspended successfully" in response.data['message']
        assert response.data['subscription_status'] == 'SUSPENDED'

        # Verify database record
        target_tenant.refresh_from_db()
        assert target_tenant.subscription_status == 'SUSPENDED'

    def test_toggle_active_reactivates_suspended_tenant(self, api_client, superadmin_user, target_tenant):
        # Set to suspended first
        target_tenant.subscription_status = 'SUSPENDED'
        target_tenant.save()

        api_client.force_authenticate(user=superadmin_user)
        
        # Reactivate
        response = api_client.post(f'/api/internal/tenants/{target_tenant.id}/toggle-active/')
        assert response.status_code == status.HTTP_200_OK
        assert "activated successfully" in response.data['message']
        assert response.data['subscription_status'] == 'ACTIVE'

        # Verify database record
        target_tenant.refresh_from_db()
        assert target_tenant.subscription_status == 'ACTIVE'

    def test_toggle_active_unauthorized_if_not_superadmin(self, api_client, support_user, target_tenant):
        api_client.force_authenticate(user=support_user)
        
        response = api_client.post(f'/api/internal/tenants/{target_tenant.id}/toggle-active/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Status remains active
        target_tenant.refresh_from_db()
        assert target_tenant.subscription_status == 'ACTIVE'
