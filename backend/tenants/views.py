from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django_tenants.utils import schema_context
from .models import RegistrationRequest, Tenant, Domain
from .serializers import RegistrationRequestSerializer, TenantSettingsSerializer
from users.models import User
from core.models import Department, Role, Golongan, Employee

class PublicSignupViewSet(viewsets.GenericViewSet):
    """
    Public-facing signup API for new tenants.
    """
    queryset = RegistrationRequest.objects.all()
    serializer_class = RegistrationRequestSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()
        
        # Stub: Send email notification to user
        # send_mail('Registration Received', 'We are reviewing your request.', 'noreply@hrms.com', [registration.admin_email])
        
        return Response({
            'message': 'Registration request submitted successfully. Our admin will review it shortly.',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

class RegistrationApprovalViewSet(viewsets.ModelViewSet):
    """
    Internal API for admins to review and approve registrations.
    """
    queryset = RegistrationRequest.objects.all()
    serializer_class = RegistrationRequestSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        registration = self.get_object()
        
        if registration.status != 'PENDING':
            return Response({'error': 'Only pending requests can be approved.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # 1. Create Tenant
                # Convert prefix to a valid schema name (snake_case)
                schema_name = registration.subdomain_prefix.replace('-', '_').lower()
                
                tenant = Tenant.objects.create(
                    schema_name=schema_name,
                    name=registration.company_name
                )
                
                # 2. Create Domain
                from django.conf import settings
                domain_name = f"{registration.subdomain_prefix}.{settings.TENANT_DOMAIN_SUFFIX}"
                domain = Domain.objects.create(
                    domain=domain_name,
                    tenant=tenant,
                    is_primary=True
                )
                
                # 3. Handle Admin User
                # User is in SHARED_APPS, so we create it once in 'public'
                admin_user, created = User.objects.get_or_create(
                    email=registration.admin_email,
                    defaults={
                        'first_name': registration.company_name + " Admin",
                        'is_staff': True, # Allow login to admin if needed
                    }
                )
                if created:
                    admin_user.set_password('change-me-123')
                    admin_user.save()
                
                # Assign user to the new tenant
                admin_user.tenants.add(tenant)

                # 4. Auto-provision HR Master Data for the new tenant
                with schema_context(tenant.schema_name):
                    # Create Default Department
                    dept = Department.objects.create(
                        name="Management",
                        description="Default department for administrative staff"
                    )
                    
                    # Create Default Role (Jabatan)
                    role = Role.objects.create(
                        name="Company Admin",
                        department=dept,
                        description="Top-level administrative role"
                    )
                    
                    # Create Default Golongan (for payroll stub)
                    gol = Golongan.objects.create(
                        name="G1",
                        base_salary=10000000,
                        meal_allowance=50000,
                        transport_allowance=30000
                    )

                    # Initialize all foundational roles if they don't exist yet (fallback for signal delay)
                    from core.services import RoleService
                    admin_role, staff_role = RoleService.initialize_default_roles()

                    # Create Employee record for the admin
                    from datetime import date
                    Employee.objects.create(
                        nik="ADMIN-001",
                        fullname=registration.company_name + " Admin",
                        email=registration.admin_email,
                        department=dept,
                        role=role,
                        golongan=gol,
                        access_role=admin_role,
                        status='PERMANENT',
                        join_date=date.today(),
                        ktp_number=f"ADM-{registration.id}" # Unique placeholder
                    )

                # 5. Update status
                registration.status = 'APPROVED'
                registration.save()
                
            # Stub: Send welcome email to admin_email with login instructions
            # send_mail('Welcome to HRMS', f'Your schema {domain_name} is ready. Login with {registration.admin_email}.', 'noreply@hrms.com', [registration.admin_email])

            return Response({
                'message': f'Tenant {registration.company_name} approved and provisioned as Admin-Employee.',
                'domain': domain_name,
                'admin_email': registration.admin_email
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        registration = self.get_object()
        if registration.status != 'PENDING':
             return Response({'error': 'Only pending requests can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
             
        registration.status = 'REJECTED'
        registration.save()
        return Response({'message': 'Registration request rejected.'})

class TenantSettingsAPIView(generics.RetrieveUpdateAPIView):
    """
    API for retrieving and updating the current tenant's profile (Logo, Address, Phone).
    GET is public (so login pages can show the logo).
    PUT/PATCH requires Admin authentication.
    """
    serializer_class = TenantSettingsSerializer
    required_rbac_permission = 'manage_settings'

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        from core.permissions import HasRBACPermission
        return [permissions.IsAuthenticated(), HasRBACPermission()]

    def get_object(self):
        # request.tenant is injected by TenantMainMiddleware
        return self.request.tenant
