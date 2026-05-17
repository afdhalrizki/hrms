import pytest
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from tenants.models import Tenant
from users.global_constants import (
    ROLE_SUPERADMIN,
    ROLE_ONBOARDING,
    ROLE_SUPPORT,
    ROLE_BILLING,
    GLOBAL_MANAGE_TENANTS,
    GLOBAL_MASQUERADE,
)
from users.permissions import HasGlobalPermission
from users.middleware import TenantAccessMiddleware
from django.http import HttpResponse

User = get_user_model()

class DummyView(APIView):
    permission_classes = [HasGlobalPermission]
    required_global_permission = GLOBAL_MANAGE_TENANTS

    def get(self, request):
        return Response({"status": "ok"})

@pytest.mark.django_db
class TestGlobalRBAC:
    
    @pytest.fixture
    def factory(self):
        return APIRequestFactory()

    @pytest.fixture
    def public_tenant(self):
        return Tenant.objects.get(schema_name='public')

    @pytest.fixture
    def client_tenant(self):
        from django_tenants.utils import schema_context
        with schema_context('public'):
            # Retrieve an existing seeded tenant or create one
            tenant = Tenant.objects.filter(schema_name='tenant_a').first()
            if not tenant:
                tenant = Tenant.objects.create(schema_name='tenant_a', name='Tenant A')
                from tenants.models import Domain
                Domain.objects.create(domain='tenanta.com', tenant=tenant, is_primary=True)
        return tenant

    @pytest.fixture
    def superadmin(self):
        return User.objects.create_user(email='super@hrms.com', password='pw', global_role=ROLE_SUPERADMIN)

    @pytest.fixture
    def support_agent(self, client_tenant):
        user = User.objects.create_user(email='support@hrms.com', password='pw', global_role=ROLE_SUPPORT)
        user.tenants.add(client_tenant)
        return user

    @pytest.fixture
    def onboarding_agent(self):
        return User.objects.create_user(email='onboarding@hrms.com', password='pw', global_role=ROLE_ONBOARDING)

    # 1. Test Permissions Class
    def test_has_global_permission_superadmin(self, factory, superadmin):
        request = factory.get('/')
        force_authenticate(request, user=superadmin)
        view = DummyView.as_view()
        response = view(request)
        assert response.status_code == 200

    def test_has_global_permission_onboarding(self, factory, onboarding_agent):
        request = factory.get('/')
        force_authenticate(request, user=onboarding_agent)
        view = DummyView.as_view()
        response = view(request)
        # Onboarding has GLOBAL_MANAGE_TENANTS
        assert response.status_code == 200

    def test_has_global_permission_support_denied(self, factory, support_agent):
        request = factory.get('/')
        force_authenticate(request, user=support_agent)
        view = DummyView.as_view()
        response = view(request)
        # Support does NOT have GLOBAL_MANAGE_TENANTS
        assert response.status_code == 403

    # 2. Test Middleware Masquerade
    def get_response_mock(self, request):
        return HttpResponse("OK", status=200)

    def test_middleware_superadmin_bypasses_client_tenant(self, factory, superadmin, client_tenant):
        request = factory.get('/api/test/')
        request.user = superadmin
        request.tenant = client_tenant
        
        middleware = TenantAccessMiddleware(self.get_response_mock)
        response = middleware(request)
        
        assert response.status_code == 200

    def test_middleware_support_agent_assigned_tenant(self, factory, support_agent, client_tenant):
        request = factory.get('/api/test/')
        request.user = support_agent
        request.tenant = client_tenant
        
        middleware = TenantAccessMiddleware(self.get_response_mock)
        response = middleware(request)
        
        assert response.status_code == 200

    def test_middleware_support_agent_unassigned_tenant(self, factory, support_agent):
        from django_tenants.utils import schema_context
        with schema_context('public'):
            unassigned_tenant = Tenant.objects.create(schema_name='tenant_b', name='Tenant B')
            from tenants.models import Domain
            Domain.objects.create(domain='tenantb.com', tenant=unassigned_tenant, is_primary=True)
        
        request = factory.get('/api/test/')
        request.user = support_agent
        request.tenant = unassigned_tenant
        
        middleware = TenantAccessMiddleware(self.get_response_mock)
        response = middleware(request)
        
        # Should be redirected or 403 because they are not assigned to tenant_b
        assert response.status_code in [302, 403]

    def test_middleware_onboarding_cannot_bypass(self, factory, onboarding_agent, client_tenant):
        request = factory.get('/api/test/')
        request.user = onboarding_agent
        request.tenant = client_tenant
        
        middleware = TenantAccessMiddleware(self.get_response_mock)
        response = middleware(request)
        
        # Onboarding does not have MASQUERADE permission
        assert response.status_code in [302, 403]
