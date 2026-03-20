from django.contrib import admin
from .models import ReimbursementCategory, Reimbursement

@admin.register(ReimbursementCategory)
class ReimbursementCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'max_amount', 'created_at')
    search_fields = ('name',)

@admin.register(Reimbursement)
class ReimbursementAdmin(admin.ModelAdmin):
    list_display = ('employee', 'category', 'date', 'amount', 'status', 'supervisor_status', 'finance_status')
    list_filter = ('status', 'supervisor_status', 'finance_status', 'category', 'date')
    search_fields = ('employee__fullname', 'description', 'receipt_number')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'date'
    
    fieldsets = (
        (None, {
            'fields': ('employee', 'category', 'date', 'amount', 'description', 'receipt_number', 'attachment')
        }),
        ('Approval Status', {
            'fields': ('status', 'supervisor_status', 'finance_status')
        }),
        ('Approved Details', {
            'fields': ('approved_amount', 'notes')
        }),
        ('Audit Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
