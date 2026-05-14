from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import F
from .models import SubscriptionInvoice, QuotaReductionRequest
from .serializers import CheckoutSerializer, QuotaReductionRequestSerializer
from .services import MidtransService
import time

class BillingViewSet(viewsets.GenericViewSet):
    """
    ViewSet for handling subscription billing and payments via Midtrans.
    """
    
    def get_permissions(self):
        if self.action == 'webhook':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'checkout':
            return CheckoutSerializer
        return None

    @action(detail=False, methods=['post'], url_path='checkout')
    def checkout(self, request):
        """
        Initiates a Midtrans Snap transaction for a subscription renewal or quota upgrade.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        plan = serializer.validated_data['plan_type']
        months = serializer.validated_data.get('months', 1)
        is_addon = serializer.validated_data.get('is_addon', False)
        is_storage_addon = serializer.validated_data.get('is_storage_addon', False)
        addon_count = serializer.validated_data.get('addon_count', 0)
        storage_gb = serializer.validated_data.get('storage_gb', 0)
        
        # New pricing in IDR (Strategy v2)
        PRICES = {
            'FREE': 0,
            'ESSENTIAL': 250000,
            'PROFESSIONAL': 750000,
            'PREMIUM': 1500000
        }

        # Addon Pricing per 10 employees
        ADDON_PRICES = {
            'ESSENTIAL': 50000,
            'PROFESSIONAL': 100000,
            'PREMIUM': 150000
        }

        # Storage Pricing per 1 GB
        STORAGE_GB_PRICE = 50000
        
        PLAN_BASE_EMPLOYEES = {
            'FREE': 10,
            'ESSENTIAL': 50,
            'PROFESSIONAL': 100,
            'PREMIUM': 500,
            'ENTERPRISE': 2000
        }

        if is_addon:
            # Employee Add-on Purchase Logic
            if plan not in ADDON_PRICES:
                return Response({"error": "Plan does not support employee add-ons."}, status=status.HTTP_400_BAD_REQUEST)
            
            MAX_TIER_CAPACITY = {
                'ESSENTIAL': 100,
                'PROFESSIONAL': 1000,
                'PREMIUM': 999999
            }
            
            current_total = request.tenant.total_employee_capacity
            if current_total + addon_count > MAX_TIER_CAPACITY.get(plan, 999999):
                return Response({
                    "error": f"You have reached the maximum employee capacity for the {plan} tier ({MAX_TIER_CAPACITY.get(plan)}).",
                    "code": "TIER_LIMIT_REACHED"
                }, status=status.HTTP_400_BAD_REQUEST)

            if addon_count % 10 != 0 or addon_count <= 0:
                return Response({"error": "Add-ons must be purchased in blocks of 10."}, status=status.HTTP_400_BAD_REQUEST)
                
            blocks = addon_count // 10
            gross_amount = ADDON_PRICES[plan] * blocks
            description = f"HRMS Employee Quota Add-on (+{addon_count} employees)"
            
        elif is_storage_addon:
            # Storage Add-on Purchase Logic
            if storage_gb <= 0:
                return Response({"error": "Storage GB must be greater than 0."}, status=status.HTTP_400_BAD_REQUEST)
                
            gross_amount = STORAGE_GB_PRICE * storage_gb
            description = f"HRMS Storage Quota Add-on (+{storage_gb} GB)"
            
        else:
            # Standard Plan Renewal/Upgrade with optional bundled add-ons
            # 1. Plan Quota Validation
            target_max_employees = PLAN_BASE_EMPLOYEES.get(plan, 0) + addon_count + request.tenant.extra_employees
            if request.tenant.employee_count > target_max_employees:
                return Response({
                    "error": f"Jumlah karyawan saat ini ({request.tenant.employee_count}) melebihi kapasitas total ({target_max_employees}) untuk plan target.",
                    "code": "QUOTA_EXCEEDED"
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # 2. Pricing calculation
            gross_amount = PRICES[plan] * months
            if months == 12:
                gross_amount = int(gross_amount * 0.8) # 20% discount for annual
                
            # Add optional bundled addon costs
            if addon_count > 0:
                if addon_count % 10 != 0:
                    return Response({"error": "Add-ons must be purchased in blocks of 10."}, status=status.HTTP_400_BAD_REQUEST)
                blocks = addon_count // 10
                gross_amount += ADDON_PRICES.get(plan, 100000) * blocks
                
            if storage_gb > 0:
                gross_amount += STORAGE_GB_PRICE * storage_gb

            description = f"HRMS {plan.capitalize()} Subscription ({months} Months)"
            if addon_count > 0:
                description += f" + {addon_count} Employees"
            if storage_gb > 0:
                description += f" + {storage_gb} GB Storage"
            
        # Create a unique order ID: SUB-[tenant_id]-[timestamp]
        order_id = f"SUB-{request.tenant.id}-{int(time.time())}"
        
        # Create Invoice in Public Schema
        invoice = SubscriptionInvoice.objects.create(
            tenant=request.tenant,
            amount=gross_amount,
            plan_type=plan,
            midtrans_order_id=order_id,
            months_added=months if (not is_addon and not is_storage_addon) else 0,
            is_addon=is_addon,
            addon_count=addon_count if is_addon else 0,
            is_storage_addon=is_storage_addon,
            storage_gb_count=storage_gb if is_storage_addon else 0
        )
        
        midtrans = MidtransService()
        try:
            res = midtrans.create_transaction(
                order_id=order_id,
                gross_amount=gross_amount,
                customer_details={
                    "first_name": request.tenant.name,
                    "email": request.user.email,
                },
                items=[{
                    "id": f"{plan}-ADDON" if is_addon else plan,
                    "price": gross_amount,
                    "quantity": 1,
                    "name": description
                }]
            )
            
            invoice.snap_token = res['token']
            invoice.save()
            
            return Response({
                "snap_token": res['token'],
                "order_id": order_id,
                "amount": gross_amount
            })
            
        except Exception as e:
            invoice.status = 'FAILED'
            invoice.save()
            return Response({"error": str(e), "detail": "Midtrans token creation failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='webhook')
    def webhook(self, request):
        """
        Handles Midtrans HTTP Notifications (Webhooks).
        """
        data = request.data
        order_id = data.get('order_id')
        status_code = data.get('status_code')
        gross_amount = data.get('gross_amount')
        signature = data.get('signature_key')
        
        # 1. Verify Signature to prevent fraud
        midtrans = MidtransService()
        if not midtrans.verify_webhook_signature(order_id, status_code, gross_amount, signature):
            return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)
            
        # 2. Process Transaction Status
        transaction_status = data.get('transaction_status')
        
        try:
            invoice = SubscriptionInvoice.objects.get(midtrans_order_id=order_id)
        except SubscriptionInvoice.DoesNotExist:
            return Response({"detail": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if transaction_status in ['capture', 'settlement']:
            # Success! Apply Changes
            if invoice.status != 'PAID':
                invoice.status = 'PAID'
                invoice.payment_type = data.get('payment_type')
                invoice.paid_at = timezone.now()
                invoice.save()
                
                # Update Tenant Model
                tenant = invoice.tenant
                
                if invoice.is_addon:
                    # Upgrade Quota
                    tenant.extra_employees += invoice.addon_count
                elif invoice.is_storage_addon:
                    # Upgrade Storage (1 GB = 1024 MB)
                    tenant.extra_storage_mb += (invoice.storage_gb_count * 1024)
                    
                    # Auto-cancel PENDING reduction requests
                    QuotaReductionRequest.objects.filter(
                        tenant=tenant, 
                        status='PENDING'
                    ).update(
                        status='CANCELLED',
                        admin_note="Automatically cancelled due to new storage purchase.",
                        reviewed_at=timezone.now()
                    )
                else:
                    # Renew/Upgrade Plan
                    current_expiry = tenant.expiry_date or timezone.now().date()
                    if current_expiry < timezone.now().date():
                        current_expiry = timezone.now().date()
                    
                    new_expiry = current_expiry + timezone.timedelta(days=30 * invoice.months_added)
                    tenant.expiry_date = new_expiry
                    tenant.plan_type = invoice.plan_type
                    tenant.subscription_status = 'ACTIVE'
                    
                    # Apply any bundled add-ons in the invoice
                    if invoice.addon_count > 0:
                        tenant.extra_employees += invoice.addon_count
                    if invoice.storage_gb_count > 0:
                        tenant.extra_storage_mb += (invoice.storage_gb_count * 1024)
                
                tenant.save()
                
                # Notification: Payment Success
                try:
                    from notifications.services import NotificationService
                    from django_tenants.utils import schema_context as tenant_context
                    with tenant_context(tenant.schema_name):
                        NotificationService().notify_payment_status(invoice, success=True)
                except Exception as e:
                    print(f"Failed to send payment success notification: {e}")
                
        elif transaction_status in ['deny', 'cancel', 'expire']:
            invoice.status = 'FAILED'
            invoice.save()

            # Notification: Payment Failure
            try:
                from notifications.services import NotificationService
                from django_tenants.utils import schema_context as tenant_context
                with tenant_context(invoice.tenant.schema_name):
                    NotificationService().notify_payment_status(invoice, success=False)
            except Exception as e:
                print(f"Failed to send payment failure notification: {e}")
            
        return Response({"status": "OK"})

class QuotaReductionRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for handling tenant requests to reduce their extra storage quota.
    """
    queryset = QuotaReductionRequest.objects.all()
    serializer_class = QuotaReductionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Super Admins see all, Tenants only see their own
        if self.request.user.is_staff or self.request.user.is_superuser:
            return self.queryset
        
        # Ensure request.tenant is available (populated by middleware)
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return self.queryset.none()
        return self.queryset.filter(tenant=tenant)

    def perform_create(self, serializer):
        # Multi-tenant safety: Ensure tenant is set to the current tenant
        serializer.save(tenant=self.request.tenant)

    def perform_update(self, serializer):
        # Only Super Admins can approve/reject
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only super admins can review reduction requests.")

        # Get the old status from the database before saving the new changes
        old_status = QuotaReductionRequest.objects.get(pk=serializer.instance.pk).status
        instance = serializer.save()
        
        if old_status == 'PENDING' and instance.status == 'APPROVED':
            tenant = instance.tenant
            reduction_mb = instance.requested_gb_reduction * 1024
            
            # Atomic update on Tenant extra_storage_mb
            from tenants.models import Tenant
            Tenant.objects.filter(pk=tenant.pk).update(
                extra_storage_mb=F('extra_storage_mb') - reduction_mb
            )
            
            instance.reviewed_at = timezone.now()
            instance.save(update_fields=['reviewed_at'])
            
            # Send Notification
            try:
                from notifications.services import NotificationService
                from django_tenants.utils import schema_context as tenant_context
                with tenant_context(tenant.schema_name):
                    msg = f"Permohonan pengurangan storage sebesar {instance.requested_gb_reduction}GB telah DISETUJUI."
                    NotificationService().send_admin_notification("Storage Reduced", msg, level='INFO')
            except Exception as e:
                print(f"Failed to send reduction approval notification: {e}")

        elif old_status == 'PENDING' and instance.status == 'REJECTED':
            instance.reviewed_at = timezone.now()
            instance.save(update_fields=['reviewed_at'])
            
            # Send Notification
            try:
                from notifications.services import NotificationService
                from django_tenants.utils import schema_context as tenant_context
                with tenant_context(instance.tenant.schema_name):
                    msg = f"Permohonan pengurangan storage sebesar {instance.requested_gb_reduction}GB telah DITOLAK."
                    NotificationService().send_admin_notification("Storage Reduction Rejected", msg, level='WARNING')
            except Exception as e:
                print(f"Failed to send reduction rejection notification: {e}")
