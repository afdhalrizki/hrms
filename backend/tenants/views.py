from rest_framework import viewsets, permissions, status, generics
from django.conf import settings
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django_tenants.utils import schema_context
from .models import RegistrationRequest, Tenant, Domain
from .serializers import RegistrationRequestSerializer, TenantSettingsSerializer
from users.models import User
from core.models import Department, Role, Grade, Employee
from .tasks import send_registration_email_task, send_welcome_email_task
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
        
        # Send email notification asynchronously using Celery
        if getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', True):
            send_registration_email_task.delay(registration.admin_email)
        
        return Response({
            'message': 'Registration request submitted successfully. Our admin will review it shortly.',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

class RegistrationApprovalViewSet(viewsets.ModelViewSet):
    """
    Internal API for admins to review and approve registrations.
    """
    serializer_class = RegistrationRequestSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        # Always return registrations from the public schema
        return RegistrationRequest.objects.all()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        with schema_context('public'):
            registration = self.get_object()
            
            if registration.status != 'PENDING':
                return Response({'error': 'Only pending requests can be approved.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                with transaction.atomic():
                    # 1. Create Tenant
                    # Convert prefix to a valid schema name (snake_case)
                    schema_name = registration.subdomain_prefix.replace('-', '_').lower()
                    
                    from datetime import date, timedelta
                    expiry_date = date.today() + timedelta(days=14)

                    # Check if tenant already exists (e.g. from a previous failed attempt that didn't roll back)
                    tenant = Tenant.objects.filter(schema_name=schema_name).first()
                    if not tenant:
                        tenant = Tenant.objects.create(
                            schema_name=schema_name,
                            name=registration.company_name,
                            expiry_date=expiry_date
                        )
                    
                    # 2. Create Domain
                    from django.conf import settings
                    domain_name = f"{registration.subdomain_prefix}.{settings.TENANT_DOMAIN_SUFFIX}"
                    Domain.objects.get_or_create(
                        domain=domain_name,
                        defaults={
                            'tenant': tenant,
                            'is_primary': True
                        }
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
                    
                    # Assign user to the new tenant if not already assigned
                    if not admin_user.tenants.filter(id=tenant.id).exists():
                        admin_user.tenants.add(tenant)

                    # 4. Auto-provision HR Master Data for the new tenant
                    with schema_context(tenant.schema_name):
                        # Create Default Department
                        dept, _ = Department.objects.get_or_create(
                            name="Management",
                            defaults={'description': "Default department for administrative staff"}
                        )
                        
                        # Create Default Role (Jabatan)
                        role, _ = Role.objects.get_or_create(
                            name="Company Admin",
                            department=dept,
                            defaults={'description': "Top-level administrative role"}
                        )
                        
                        # Create Default Grade (for payroll stub)
                        grade_obj, _ = Grade.objects.get_or_create(
                            name="G1",
                            defaults={
                                'base_salary': 10000000,
                                'meal_allowance': 50000,
                                'transport_allowance': 30000
                            }
                        )

                        # Initialize all foundational roles if they don't exist yet
                        from core.services import RoleService
                        admin_role, staff_role = RoleService.initialize_default_roles()

                        # Create Employee record for the admin
                        from datetime import date
                        Employee.objects.get_or_create(
                            email=registration.admin_email,
                            defaults={
                                'nik': "ADMIN-001",
                                'fullname': registration.company_name + " Admin",
                                'department': dept,
                                'role': role,
                                'grade': grade_obj,
                                'access_role': admin_role,
                                'status': 'PERMANENT',
                                'join_date': date.today(),
                                'ktp_number': f"ADM-{registration.id}" # Unique placeholder
                            }
                        )

                    # 5. Update status
                    registration.status = 'APPROVED'
                    registration.save()
                
                # Send welcome email asynchronously using Celery (outside atomic block to avoid race condition with worker)
                if getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', True):
                    send_welcome_email_task.delay(registration.admin_email, domain_name)

                return Response({
                    'message': f'Tenant {registration.company_name} approved and provisioned as Admin-Employee.',
                    'domain': domain_name,
                    'admin_email': registration.admin_email
                })
            except Exception as e:
                import traceback
                print(f"[APPROVE_ERROR] {str(e)}")
                traceback.print_exc()
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        with schema_context('public'):
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
    required_rbac_permission = 'tenant_manage_settings'

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        from core.permissions import HasTenantRBACPermission
        return [permissions.IsAuthenticated(), HasTenantRBACPermission()]

    def get_object(self):
        # request.tenant is injected by TenantMainMiddleware
        return self.request.tenant

    def perform_update(self, serializer):
        from django_tenants.utils import schema_context
        # Ensure we are in the public schema when saving the shared Tenant model
        with schema_context('public'):
            serializer.save()
