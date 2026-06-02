from rest_framework import viewsets, permissions, status, generics
from django.conf import settings
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django_tenants.utils import schema_context
from .models import RegistrationRequest, Tenant, Domain, PlatformTicket, PlatformTicketMessage, GlobalSetting
from .serializers import RegistrationRequestSerializer, TenantSettingsSerializer, PlatformTicketSerializer, PlatformTicketDetailSerializer, PlatformTicketMessageSerializer
from users.models import User
from core.models import Department, Role, Grade, Employee
from .tasks import send_registration_email_task, send_welcome_email_task
from users.permissions import HasGlobalPermission
from users.global_constants import GLOBAL_MANAGE_TENANTS, GLOBAL_MANAGE_USERS

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
            send_registration_email_task.delay(
                registration.admin_email,
                company_name=registration.company_name,
                subdomain_prefix=registration.subdomain_prefix
            )
        
        return Response({
            'message': 'Registration request submitted successfully. Our admin will review it shortly.',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

class RegistrationApprovalViewSet(viewsets.ModelViewSet):
    """
    Internal API for admins to review and approve registrations.
    """
    serializer_class = RegistrationRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasGlobalPermission]
    required_global_permission = GLOBAL_MANAGE_TENANTS

    def get_queryset(self):
        # Always return registrations from the public schema
        return RegistrationRequest.objects.all()

    @action(detail=False, methods=['get'], url_path='notification-emails')
    def get_notification_emails(self, request):
        with schema_context('public'):
            setting, created = GlobalSetting.objects.get_or_create(
                key='registration_notification_emails',
                defaults={
                    'value': '',
                    'description': 'Dynamic comma-separated email list for registration notifications'
                }
            )
            
            # If value is empty, we return the default emails (active users with global_role in SUPERADMIN, ONBOARDING_AGENT)
            default_emails = []
            if not setting.value:
                default_emails = list(User.objects.filter(
                    global_role__in=['SUPERADMIN', 'ONBOARDING_AGENT'],
                    is_active=True
                ).values_list('email', flat=True))
                
            return Response({
                'emails': setting.value,
                'default_emails': default_emails,
                'is_using_default': not bool(setting.value)
            })

    @action(detail=False, methods=['post'], url_path='set-notification-emails')
    def set_notification_emails(self, request):
        with schema_context('public'):
            emails = request.data.get('emails', '')
            
            # Validate emails
            email_list = [e.strip() for e in emails.split(',') if e.strip()]
            import re
            for email in email_list:
                if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                    return Response({'error': f'Invalid email address: {email}'}, status=status.HTTP_400_BAD_REQUEST)
            
            setting, _ = GlobalSetting.objects.get_or_create(
                key='registration_notification_emails',
                defaults={'description': 'Dynamic comma-separated email list for registration notifications'}
            )
            setting.value = ','.join(email_list)
            setting.save()
            
            return Response({
                'message': 'Notification emails updated successfully.',
                'emails': setting.value
            })

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
            
        from django.db import connection
        if connection.schema_name == 'public':
            from rest_framework.permissions import BasePermission
            class IsSuperadminPermission(BasePermission):
                def has_permission(self, req, view):
                    return req.user and req.user.is_authenticated and (
                        req.user.is_superuser or 
                        getattr(req.user, 'global_role', None) == 'SUPERADMIN'
                    )
            return [IsSuperadminPermission()]

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


class InternalTenantViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasGlobalPermission]
    required_global_permission = GLOBAL_MANAGE_USERS

    def get_queryset(self):
        return Tenant.objects.exclude(schema_name='public')

    def list(self, request):
        tenants = self.get_queryset()
        data = [
            {
                "id": t.id, 
                "name": t.name, 
                "schema_name": t.schema_name,
                "subscription_status": t.subscription_status,
                "plan_type": t.plan_type,
                "expiry_date": str(t.expiry_date) if t.expiry_date else None,
                "created_on": str(t.created_on) if t.created_on else None
            } 
            for t in tenants
        ]
        return Response(data)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        tenant = self.get_object()
        if tenant.subscription_status == 'SUSPENDED':
            tenant.subscription_status = 'ACTIVE'
            message = f"Tenant {tenant.name} has been activated successfully."
        else:
            tenant.subscription_status = 'SUSPENDED'
            message = f"Tenant {tenant.name} has been suspended successfully."
        tenant.save()
        return Response({
            'message': message, 
            'subscription_status': tenant.subscription_status
        })



class PlatformTicketViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def _is_global_admin(self, user):
        return user.is_superuser or getattr(user, 'global_role', None) in ['SUPERADMIN', 'SUPPORT_AGENT']

    def get_queryset(self):
        with schema_context('public'):
            user = self.request.user
            if self._is_global_admin(user):
                return PlatformTicket.objects.all()
            
            # Tenant admins see their own tenant's platform tickets
            tenant = getattr(self.request, 'tenant', None)
            if tenant and tenant.schema_name != 'public':
                return PlatformTicket.objects.filter(tenant=tenant)
            return PlatformTicket.objects.none()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PlatformTicketDetailSerializer
        return PlatformTicketSerializer

    def list(self, request, *args, **kwargs):
        with schema_context('public'):
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        with schema_context('public'):
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        user = request.user
        tenant = getattr(request, 'tenant', None)
        if not tenant or tenant.schema_name == 'public':
            return Response({'error': 'Platform tickets must be raised from a company tenant space.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with schema_context('public'):
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(tenant=tenant, creator_email=user.email, status='OPEN')
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='messages')
    def add_message(self, request, pk=None):
        user = request.user
        with schema_context('public'):
            ticket = self.get_object()
            
            message_text = request.data.get('message')
            if not message_text:
                return Response({'error': 'Message field is required.'}, status=status.HTTP_400_BAD_REQUEST)
                
            msg = PlatformTicketMessage.objects.create(
                ticket=ticket,
                sender=user,
                message=message_text
            )
            
            # If a global admin replies, move ticket status to IN_PROGRESS
            if self._is_global_admin(user) and ticket.status == 'OPEN':
                ticket.status = 'IN_PROGRESS'
                ticket.save()
                
            serializer = PlatformTicketMessageSerializer(msg)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign(self, request, pk=None):
        user = request.user
        if not self._is_global_admin(user):
            return Response({'error': 'Only global support agents can assign tickets.'}, status=status.HTTP_403_FORBIDDEN)
            
        agent_id = request.data.get('agent_id')
        with schema_context('public'):
            ticket = self.get_object()
            if agent_id:
                agent = User.objects.filter(id=agent_id, global_role__in=['SUPERADMIN', 'SUPPORT_AGENT']).first()
                if not agent:
                    return Response({'error': 'Selected user is not a valid global support agent.'}, status=status.HTTP_400_BAD_REQUEST)
                ticket.assigned_agent = agent
            else:
                # Assign to current logged in support agent
                ticket.assigned_agent = user
            ticket.save()
            return Response({'status': 'Ticket assigned successfully.'})

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        user = request.user
        with schema_context('public'):
            ticket = self.get_object()
            
            # Creator or Global Admin can resolve
            if ticket.creator_email != user.email and not self._is_global_admin(user):
                return Response({'error': 'You do not have permission to resolve this ticket.'}, status=status.HTTP_403_FORBIDDEN)
                
            ticket.status = 'RESOLVED'
            ticket.save()
            return Response({'status': 'Ticket marked as resolved.'})

