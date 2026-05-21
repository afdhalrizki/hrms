import logging
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Sum
from datetime import date, timedelta
from django.utils import timezone
from core.audit import AuditModelMixin
from core.permissions import HasTenantRBACPermission
from .models import (
    Department, Role, Grade, Employee, AccessRole,
    Branch, WorkflowConfig, WorkflowStage, WorkflowAction,
    APIKey, AuditLog, InternalTicket, InternalTicketMessage, InternalTicketAttachment
)
from .serializers import (
    DepartmentSerializer, RoleSerializer, GradeSerializer, 
    EmployeeSerializer, AccessRoleSerializer,
    BranchSerializer, WorkflowConfigSerializer, 
    WorkflowStageSerializer, WorkflowActionSerializer,
    APIKeySerializer, AuditLogSerializer,
    InternalTicketSerializer, InternalTicketDetailSerializer, InternalTicketMessageSerializer, InternalTicketAttachmentSerializer
)
from core.mixins import TenantIsolationMixin

logger = logging.getLogger(__name__)

class APIKeyViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = APIKey.objects.all()
    serializer_class = APIKeySerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_settings'

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return APIKey.objects.all()
            
        employee = getattr(user, 'employee', None)
        if not employee:
            from .models import Employee
            employee = Employee.objects.filter(email=user.email).first()
            
        if employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_settings'):
            return APIKey.objects.all()
        return APIKey.objects.none()


class AuditLogViewSet(TenantIsolationMixin, viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_view_audit_logs'

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return AuditLog.objects.all()
            
        employee = getattr(user, 'employee', None)
        if not employee:
            from .models import Employee
            employee = Employee.objects.filter(email=user.email).first()
            
        if employee and employee.access_role and employee.access_role.permissions.get('tenant_view_audit_logs'):
            return AuditLog.objects.all()
            
        # Raise 403 instead of returning empty list to be strict with audit logs
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("You do not have permission to view audit logs.")


class BranchViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'


class WorkflowConfigViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = WorkflowConfig.objects.all()
    serializer_class = WorkflowConfigSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_settings'


class WorkflowStageViewSet(AuditModelMixin, viewsets.ModelViewSet):
    queryset = WorkflowStage.objects.all()
    serializer_class = WorkflowStageSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_settings'


class WorkflowActionViewSet(AuditModelMixin, viewsets.ReadOnlyModelViewSet):
    queryset = WorkflowAction.objects.all()
    serializer_class = WorkflowActionSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_attendance' # Actors need this to see history


class DepartmentViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'


class RoleViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'


class GradeViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'


class AccessRoleViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = AccessRole.objects.all()
    serializer_class = AccessRoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_access_roles'


class EmployeeViewSet(TenantIsolationMixin, AuditModelMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.none()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'
    allow_self_service = True

    def get_queryset(self):
        from django.db import connection
        
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()

        # Managers/HR see everyone
        if user.is_staff or (employee and employee.access_role and employee.access_role.permissions.get('tenant_manage_hr')):
            queryset = Employee.objects.all().select_related(
                'department', 'role', 'role__department', 'grade', 'branch', 'access_role', 'supervisor'
            )
            dept_id = self.request.query_params.get('department')
            if dept_id:
                queryset = queryset.filter(department_id=dept_id)

            show_terminated = self.request.query_params.get('show_terminated') == 'true'
            if not show_terminated:
                queryset = queryset.exclude(status__in=['TERMINATED', 'RESIGNED'])

            return queryset
            
        # Employees can only see themselves
        if employee:
            return Employee.objects.filter(id=employee.id).select_related(
                'department', 'role', 'role__department', 'grade', 'branch', 'access_role', 'supervisor'
            )
            
        return Employee.objects.none()

    def get_serializer_class(self):
        if self.request.query_params.get('lite') == 'true':
            from .serializers import EmployeeLiteSerializer
            return EmployeeLiteSerializer
            
        # If it's a self-service update (not a manager), use the restricted profile serializer
        user = self.request.user
        if not user.is_staff:
            employee = Employee.objects.filter(email=user.email).select_related('access_role').first()
            if employee and not (employee.access_role and employee.access_role.permissions.get('tenant_manage_hr')):
                from .serializers import EmployeeProfileSerializer
                return EmployeeProfileSerializer
                
        return EmployeeSerializer

    def create(self, request, *args, **kwargs):
        """
        Custom create method to handle optional User account provisioning linking.
        Accepts: 'create_user' (bool) and 'is_admin' (bool) in request data.
        """
        try:
            print(f"DEBUG: EmployeeViewSet.create called for {request.path}")
        except Exception:
            pass
        create_user_flag = str(request.data.get('create_user', 'false')).lower() == 'true'
        is_admin_flag = str(request.data.get('is_admin', 'false')).lower() == 'true'

        # Quota Enforcement: Check total employee capacity (Base + Purchased Addons)
        if hasattr(request, 'tenant') and request.tenant and request.tenant.schema_name != 'public':
            from tenants.models import Tenant
            try:
                # Refresh count from DB to avoid stale data issues
                t = Tenant.objects.get(schema_name=request.tenant.schema_name)
                current_count = t.employee_count
                capacity = t.total_employee_capacity
                is_terminated = str(request.data.get('status', '')).upper() == 'TERMINATED'
                if not is_terminated and current_count >= capacity:
                    return Response({
                        'error': f'Employee quota exceeded for your {t.plan_type} plan (Limit: {capacity}).',
                        'code': 'QUOTA_EXCEEDED'
                    }, status=status.HTTP_403_FORBIDDEN)
            except Tenant.DoesNotExist:
                pass

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from users.models import User
        
        try:
            with transaction.atomic():
                # 1. Create the Employee Profile
                employee = serializer.save()

                # 2. Provision User Account if requested
                if create_user_flag:
                    user, created = User.objects.get_or_create(
                        email=employee.email,
                        defaults={
                            'first_name': employee.fullname,
                            'is_staff': is_admin_flag,
                        }
                    )
                    
                    if created:
                        # Set default password for newly provisioned users
                        user.set_password('HariKerja2026!')
                        user.save()
                    elif is_admin_flag and not user.is_staff:
                        # If user exists but is being upgraded to admin in this context
                        user.is_staff = True
                        user.save()

                    # 3. Bind the User to the current Tenant 
                    if hasattr(request, 'tenant') and request.tenant:
                        user.tenants.add(request.tenant)

                    # 4. Trigger Onboarding Notification (NEW)
                    from notifications.services import NotificationService
                    service = NotificationService()
                    
                    # Determine domain name for the login link
                    domain_name = "app.HariKerja.com"
                    if hasattr(request, 'tenant') and request.tenant:
                        domain = request.tenant.domains.first()
                        if domain:
                            domain_name = domain.domain
                    
                    service.notify_employee_onboarding(employee, domain_name)

                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            # Catch quota or validation errors
            err_msg = str(e)
            if err_msg.startswith("['") and err_msg.endswith("']"):
                err_msg = err_msg[2:-2]
            err_msg_lower = err_msg.lower()
            if 'quota' in err_msg_lower and 'exceeded' in err_msg_lower:
                return Response({
                    'error': err_msg,
                    'code': 'QUOTA_EXCEEDED'
                }, status=status.HTTP_403_FORBIDDEN)
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """
        Custom update method to catch Django ValidationError from pre_save signals
        and return a clean HTTP 400 response.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                self.perform_update(serializer)
            return Response(serializer.data)
        except Exception as e:
            err_msg = str(e)
            if err_msg.startswith("['") and err_msg.endswith("']"):
                err_msg = err_msg[2:-2]
            err_msg_lower = err_msg.lower()
            if 'quota' in err_msg_lower and 'exceeded' in err_msg_lower:
                return Response({
                    'error': err_msg,
                    'code': 'QUOTA_EXCEEDED'
                }, status=status.HTTP_403_FORBIDDEN)
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        """
        Endpoint khusus untuk menonaktifkan/menghentikan karyawan (TERMINATED).
        Melewati validasi serializer choices untuk menulis langsung ke model status.
        """
        employee = self.get_object()
        
        # Set status secara langsung (bypassing serializer choices)
        employee.status = 'TERMINATED'
        employee.save()
        
        return Response(
            {'status': f'Karyawan {employee.fullname} telah dinonaktifkan (TERMINATED).'},
            status=status.HTTP_200_OK
        )

class DashboardStatsAPIView(TenantIsolationMixin, views.APIView):
    permission_classes = [permissions.IsAuthenticated, HasTenantRBACPermission]
    required_rbac_permission = 'tenant_manage_hr'

    def get(self, request):
        from django.db import connection
        
        # Default empty response structure
        empty_stats = {
            'total_employees': 0,
            'attendance_today': [],
            'pending_leaves': 0,
            'new_hires': 0,
            'department_distribution': [],
            'payroll_summary': {'total_net_pay': 0, 'total_overtime': 0},
            'trends': {'months': [], 'headcount': []},
            'attendance_percent': 0
        }

        if connection.schema_name == 'public':
            user = request.user
            is_global = getattr(user, 'global_role', None) or getattr(user, 'is_global_admin', False) or user.is_superuser
            if is_global:
                from tenants.models import Tenant, RegistrationRequest
                from users.models import User
                
                total_tenants = Tenant.objects.exclude(schema_name='public').count()
                pending_regs = RegistrationRequest.objects.filter(status='PENDING').count()
                total_admins = User.objects.exclude(global_role__isnull=True).exclude(global_role='').count()
                
                approved_regs = RegistrationRequest.objects.filter(status='APPROVED').count()
                rejected_regs = RegistrationRequest.objects.filter(status='REJECTED').count()
                
                return Response({
                    'is_global_admin_dashboard': True,
                    'total_tenants': total_tenants,
                    'pending_registrations': pending_regs,
                    'total_global_admins': total_admins,
                    'approved_registrations': approved_regs,
                    'rejected_registrations': rejected_regs,
                })
            return Response(empty_stats)

        try:
            from attendance.models import Attendance
            today = timezone.localdate()

            # Full Organization Stats for HR/Managers
            total_employees = Employee.objects.count()
            dept_stats = Department.objects.annotate(
                employee_count=Count('employees'),
            ).values('name', 'employee_count')

            attendance_stats = Attendance.objects.filter(date=today).values('status').annotate(count=Count('id'))
            
            # Use status__in to count PRESENT and LATE
            present_count = Attendance.objects.filter(date=today, status__in=['PRESENT', 'LATE']).count()
            
            # If present_count is 0, let's check if there are ANY records for today (maybe they are all ABSENT/LEAVE)
            # This is helpful for debugging why it shows 0%
            total_attendance_today = Attendance.objects.filter(date=today).count()
            
            from attendance.models import LeaveRequest
            pending_leaves = LeaveRequest.objects.filter(status='PENDING').count()
            
            thirty_days_ago = today - timezone.timedelta(days=30)
            new_hires = Employee.objects.filter(join_date__gte=thirty_days_ago).count()

            from payroll.models import Payslip
            payroll_totals = Payslip.objects.filter(
                period__month=today.month,
                period__year=today.year,
                payment_date__isnull=False
            ).aggregate(
                total_salary=Sum('net_pay'),
                total_overtime=Sum('overtime_pay')
            )

            # Recalculate percent cleanly
            attendance_percent = (present_count / total_employees * 100) if total_employees > 0 else 0
            
            return Response({
                'total_employees': total_employees,
                'attendance_percent': round(attendance_percent, 1),
                'attendance_today': list(attendance_stats),
                'pending_leaves': pending_leaves,
                'new_hires': new_hires,
                'department_distribution': list(dept_stats),
                'payroll_summary': {
                    'total_net_pay': float(payroll_totals['total_salary'] or 0),
                    'total_overtime': float(payroll_totals['total_overtime'] or 0),
                },
                'trends': {
                    'months': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    'headcount': [total_employees] * 6,
                }
            })
        except Exception as e:
            logger.error(f"Error in DashboardStatsAPIView: {e}")
            return Response(empty_stats)


class InternalTicketViewSet(TenantIsolationMixin, viewsets.ModelViewSet):
    queryset = InternalTicket.objects.all()
    serializer_class = InternalTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_employee(self):
        user = self.request.user
        employee = Employee.objects.filter(email=user.email).first()
        if not employee and not user.is_superuser:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You must be registered as an employee to access internal support tickets.")
        return employee

    def _is_hr_admin(self, user, employee):
        if user.is_staff or user.is_superuser:
            return True
        if employee and employee.access_role and (
            employee.access_role.permissions.get('tenant_manage_hr') or 
            employee.access_role.permissions.get('tenant_manage_settings')
        ):
            return True
        return False

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return InternalTicket.objects.all()
        employee = self._get_employee()
        if self._is_hr_admin(user, employee):
            return InternalTicket.objects.all()
        return InternalTicket.objects.filter(creator=employee)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return InternalTicketDetailSerializer
        return InternalTicketSerializer

    def perform_create(self, serializer):
        employee = self._get_employee()
        serializer.save(creator=employee, status='OPEN')

    @action(detail=True, methods=['post'], url_path='messages')
    def add_message(self, request, pk=None):
        ticket = self.get_object()
        employee = self._get_employee()
        user = request.user
        
        is_internal = str(request.data.get('is_internal', 'false')).lower() == 'true'
        if is_internal and not self._is_hr_admin(user, employee):
            return Response({'error': 'Only HR/Admins can write internal notes.'}, status=status.HTTP_403_FORBIDDEN)
            
        message_text = request.data.get('message')
        if not message_text:
            return Response({'error': 'Message field is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        msg = InternalTicketMessage.objects.create(
            ticket=ticket,
            sender=employee,
            message=message_text,
            is_internal=is_internal
        )
        
        # If user is HR and replying, move ticket status to IN_PROGRESS
        if self._is_hr_admin(user, employee) and ticket.status == 'OPEN':
            ticket.status = 'IN_PROGRESS'
            ticket.save()
            
        serializer = InternalTicketMessageSerializer(msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        employee = self._get_employee()
        user = request.user
        
        # Creator or HR/Admin can resolve/close
        if ticket.creator != employee and not self._is_hr_admin(user, employee):
            return Response({'error': 'You do not have permission to resolve this ticket.'}, status=status.HTTP_403_FORBIDDEN)
            
        ticket.status = 'RESOLVED'
        ticket.save()
        return Response({'status': 'Ticket marked as resolved.'})

    @action(detail=True, methods=['post'], url_path='attachments')
    def add_attachment(self, request, pk=None):
        ticket = self.get_object()
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'File is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        attachment = InternalTicketAttachment.objects.create(
            ticket=ticket,
            file=file_obj
        )
        serializer = InternalTicketAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HelpGuidelineAPIView(views.APIView):
    """
    Returns step-by-step interactive guidelines (user journeys) 
    tailored specifically to the platform (Web/Mobile) and the user's role 
    (Tenant User, Tenant Admin, or Global Admin).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        platform = request.query_params.get('platform', 'web').lower()
        if platform not in ['web', 'mobile']:
            platform = 'web'

        user = request.user
        
        # 1. Determine Role
        if user.is_superuser or getattr(user, 'global_role', None) in ['SUPERADMIN', 'SUPPORT_AGENT']:
            role = 'global_admin'
            role_label = 'Global SaaS Admin'
        elif user.is_staff:
            role = 'tenant_admin'
            role_label = 'Company HR Admin'
        else:
            role = 'tenant_user'
            role_label = 'Employee'

        # 2. Guidelines Matrix
        guidelines = []

        if role == 'tenant_user':
            if platform == 'mobile':
                guidelines = [
                    {
                        'title': 'Melakukan Absensi Harian (Check-in/Out)',
                        'description': 'Langkah-langkah merekam kehadiran masuk dan pulang kerja dengan validasi lokasi GPS.',
                        'steps': [
                            'Buka aplikasi HariKerja di smartphone Anda dan masuk ke halaman Dashboard Utama.',
                            'Ketuk tombol "Check In" yang berwarna hijau di tengah bawah layar.',
                            'Izinkan aplikasi mendeteksi lokasi GPS Anda jika diminta.',
                            'Posisikan wajah Anda di dalam lingkaran kamera depan untuk verifikasi wajah (jika diaktifkan oleh admin).',
                            'Ketuk tombol "Konfirmasi Check In" dan tunggu hingga notifikasi sukses muncul.',
                            'Untuk pulang kerja, ulangi proses di atas dengan mengetuk tombol "Check Out".'
                        ],
                        'tips': 'Pastikan GPS dan jaringan internet Anda dalam kondisi aktif dan stabil sebelum melakukan absensi.'
                    },
                    {
                        'title': 'Mengajukan Cuti atau Izin Kerja',
                        'description': 'Cara mengirimkan permohonan cuti, sakit, atau izin secara digital.',
                        'steps': [
                            'Di aplikasi mobile, masuk ke tab "Layanan Mandiri" (Self-Service).',
                            'Pilih menu "Pengajuan Cuti / Izin".',
                            'Pilih tipe cuti yang ingin diambil (misal: Cuti Tahunan, Sakit, atau Izin Penting).',
                            'Tentukan tanggal mulai dan berakhirnya cuti.',
                            'Tuliskan keterangan/alasan cuti di kolom deskripsi, dan unggah surat dokter jika Anda mengajukan izin sakit.',
                            'Ketuk "Kirim Permohonan". Permohonan Anda akan diteruskan ke HR untuk persetujuan.'
                        ],
                        'tips': 'Anda bisa memantau sisa kuota cuti tahunan Anda secara real-time langsung di menu Dashboard.'
                    },
                    {
                        'title': 'Mengajukan Koreksi Absensi (Correction)',
                        'description': 'Jika Anda lupa melakukan check-in atau check-out, ikuti panduan ini.',
                        'steps': [
                            'Buka menu "Koreksi Kehadiran" di tab Layanan Mandiri.',
                            'Pilih tanggal absensi yang ingin Anda koreksi.',
                            'Pilih jenis koreksi (misal: Lupa Check-in, Lupa Check-out, atau Jam Salah).',
                            'Masukkan jam koreksi yang benar beserta alasan pendukung yang valid.',
                            'Ketuk "Ajukan Koreksi".'
                        ]
                    }
                ]
            else: # tenant_user on web
                guidelines = [
                    {
                        'title': 'Melihat & Mengunduh Slip Gaji (Payslip)',
                        'description': 'Panduan aman mengakses berkas slip gaji bulanan Anda di portal web.',
                        'steps': [
                            'Buka web browser dan akses dashboard portal karyawan Anda.',
                            'Klik menu "Keuangan" lalu pilih sub-menu "Slip Gaji".',
                            'Pilih periode bulan dan tahun slip gaji yang ingin Anda lihat.',
                            'Klik tombol "Detail" untuk membuka pratinjau slip gaji Anda.',
                            'Gunakan tombol "Unduh PDF" untuk menyimpan salinan slip gaji ke komputer Anda secara aman.'
                        ],
                        'tips': 'Slip gaji dilindungi enkripsi, pastikan Anda menggunakan komputer pribadi saat mengunduh berkas sensitif ini.'
                    },
                    {
                        'title': 'Klaim Pengembalian Dana (Reimbursement)',
                        'description': 'Langkah-langkah mengajukan klaim biaya medis, perjalanan, atau operasional kantor.',
                        'steps': [
                            'Di menu navigasi kiri dashboard, klik "Layanan Mandiri" lalu pilih "Klaim Reimbursement".',
                            'Klik tombol "+ Buat Pengajuan Baru".',
                            'Pilih Kategori Klaim (misal: Transportasi, Medis, Kacamata, dll).',
                            'Masukkan nominal uang klaim sesuai dengan bukti kuitansi fisik.',
                            'Unggah foto bukti kuitansi/nota yang jelas dan terbaca.',
                            'Klik tombol "Kirim". HR akan memvalidasi bukti Anda sebelum menyetujui pengembalian.'
                        ]
                    }
                ]

        elif role == 'tenant_admin':
            if platform == 'web':
                guidelines = [
                    {
                        'title': 'Mengelola Data Karyawan Baru (Onboarding)',
                        'description': 'Menambahkan profil karyawan baru dan mengaitkannya ke unit kerja, jabatan, dan struktur gaji.',
                        'steps': [
                            'Masuk ke Dashboard Admin utama dan pilih menu "Karyawan" > "Data Karyawan".',
                            'Klik tombol berwarna biru "+ Tambah Karyawan".',
                            'Isi informasi pribadi dasar (Nama Lengkap, NIK, No KTP, Email Aktif).',
                            'Di bagian Hubungan Kerja, tentukan Departemen, Jabatan (Role), Grade Gaji, serta tanggal mulai bergabung.',
                            'Pilih Level Akses Sistem (misal: Staff atau Manager).',
                            'Klik "Simpan Data". Sistem akan otomatis mengirimkan email aktivasi kredensial kepada karyawan baru tersebut.'
                        ]
                    },
                    {
                        'title': 'Mengonfigurasi Aturan & Alur Persetujuan (Approval Workflow)',
                        'description': 'Menentukan struktur berjenjang bagi persetujuan cuti, lembur, maupun reimbursement.',
                        'steps': [
                            'Pilih menu "Pengaturan" > "Konfigurasi Alur Kerja (Workflow)".',
                            'Klik "+ Buat Alur Persetujuan Baru".',
                            'Pilih jenis transaksi yang akan dikontrol (misal: "Leave Request" atau "Reimbursement").',
                            'Tambahkan jenjang persetujuan (Level 1: Supervisor Langsung, Level 2: HR Manager).',
                            'Tentukan parameter kondisi khusus (misal: hanya berlaku untuk nominal di atas Rp 1.000.000).',
                            'Klik "Aktifkan Alur Kerja". Aturan persetujuan ini akan langsung berjalan real-time.'
                        ]
                    },
                    {
                        'title': 'Menjalankan Proses Payroll Bulanan (Payroll Run)',
                        'description': 'Menghitung total gaji bersih karyawan otomatis berdasarkan komponen tetap, kehadiran, potongan absensi, serta pajak PPh 21.',
                        'steps': [
                            'Klik menu "Penggajian (Payroll)" > "Periode Payroll".',
                            'Klik tombol "+ Buka Periode Penggajian Baru" (biasanya tanggal 21 sampai 20 bulan berikutnya).',
                            'Pilih "Hitung Kehadiran Karyawan" untuk sinkronisasi otomatis absensi masuk/pulang serta lembur.',
                            'Verifikasi semua potongan absensi otomatis dan tunjangan variabel.',
                            'Klik "Hitung Gaji Akhir". Sistem akan memproses payslip draf untuk semua karyawan aktif.',
                            'Klik "Verifikasi & Rilis Slip Gaji" agar slip gaji bulanan dapat diakses oleh karyawan.'
                        ]
                    }
                ]
            else: # tenant_admin on mobile
                guidelines = [
                    {
                        'title': 'Persetujuan Cepat Permohonan Karyawan (Quick Approvals)',
                        'description': 'Meninjau dan menyetujui permohonan cuti atau lembur karyawan saat bepergian langsung dari ponsel.',
                        'steps': [
                            'Buka aplikasi HariKerja Admin di smartphone Anda.',
                            'Di Dashboard Utama, lihat bagian widget "Persetujuan Tertunda".',
                            'Ketuk permohonan yang ingin Anda tinjau untuk melihat detail alasan, sisa cuti, atau lampiran bukti.',
                            'Geser ke kanan untuk "Setujui" (Approve) atau geser ke kiri untuk "Tolak" (Reject).',
                            'Karyawan yang bersangkutan akan menerima notifikasi instan di aplikasinya.'
                        ]
                    },
                    {
                        'title': 'Memantau Dasbor Kehadiran Harian',
                        'description': 'Melihat rekap langsung persentase kehadiran tim hari ini.',
                        'steps': [
                            'Masuk ke menu utama dan pilih "Statistik Kehadiran Harian".',
                            'Lihat grafik pie untuk memantau jumlah karyawan yang Hadir Tepat Waktu, Terlambat, Sakit, atau Alpa.',
                            'Ketuk kategori "Terlambat" untuk melihat daftar nama dan jam kedatangan mereka.'
                        ]
                    }
                ]

        elif role == 'global_admin':
            if platform == 'web':
                guidelines = [
                    {
                        'title': 'Verifikasi & Aktivasi Registrasi Tenant Baru',
                        'description': 'Panduan bagi Superadmin SaaS untuk menyetujui permintaan pembuatan perusahaan baru.',
                        'steps': [
                            'Masuk ke portal utama Superadmin SaaS di domain public.',
                            'Pilih menu "Registrasi Tenant" > "Menunggu Persetujuan".',
                            'Periksa data profil perusahaan, subdomain yang diajukan, alamat email admin, serta paket langganan.',
                            'Klik tombol "Setujui Registrasi".',
                            'Sistem akan memicu skrip backend otomatis untuk memigrasi basis data skema tenant, menyalin data master dasar, serta memicu pengiriman email selamat datang berisi tautan aktivasi akun.'
                        ]
                    },
                    {
                        'title': 'Penyelesaian Tiket Bantuan SaaS (Platform Support)',
                        'description': 'Menangani tiket bantuan teknis atau keluhan sistem dari para administrator tenant.',
                        'steps': [
                            'Masuk ke dashboard bantuan umum > "Platform Tickets".',
                            'Pilih tiket terbuka (Status: OPEN) untuk membaca detail permasalahan.',
                            'Klik tombol "Tugaskan ke Saya" (Assign to Me) untuk mengklaim tiket tersebut.',
                            'Ketik tanggapan balasan beserta tautan atau dokumen solusi pendukung.',
                            'Setelah masalah dikonfirmasi teratasi oleh pengguna, klik tombol "Tandai Selesai" (Resolve Ticket).'
                        ]
                    }
                ]
            else: # global_admin on mobile
                guidelines = [
                    {
                        'title': 'Dasbor Pemantauan SaaS Seluler',
                        'description': 'Melihat grafik kesehatan sistem dan volume transaksi total hari ini.',
                        'steps': [
                            'Buka aplikasi HariKerja Admin Global.',
                            'Lihat metrik utama secara sekilas: total tenant aktif, total pengguna daring (online), penggunaan penyimpanan awan global, serta grafik performa latensi API backend.',
                            'Gunakan tab notifikasi sistem untuk mendapatkan pemberitahuan instan jika terjadi anomali beban server.'
                        ]
                    }
                ]

        return Response({
            'platform': platform,
            'role': role,
            'role_label': role_label,
            'guidelines': guidelines
        }, status=status.HTTP_200_OK)


