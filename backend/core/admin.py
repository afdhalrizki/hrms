from django.contrib import admin
from .models import (
    Department, Role, Golongan, Employee, Branch, 
    WorkflowConfig, WorkflowStage, WorkflowAction,
    APIKey, AuditLog
)

@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ('label', 'key_prefix', 'is_active', 'expires_at', 'last_used_at')
    list_filter = ('is_active',)
    readonly_fields = ('key_prefix', 'key_hash', 'last_used_at', 'created_at', 'updated_at')

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'action_type', 'model_name', 'object_id', 'actor', 'ip_address')
    list_filter = ('action_type', 'model_name')
    readonly_fields = ('timestamp', 'action_type', 'model_name', 'object_id', 'changed_fields', 'actor', 'ip_address')

class WorkflowStageInline(admin.TabularInline):
    model = WorkflowStage
    extra = 1

@admin.register(WorkflowConfig)
class WorkflowConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'model_type', 'is_active')
    inlines = [WorkflowStageInline]

@admin.register(WorkflowAction)
class WorkflowActionAdmin(admin.ModelAdmin):
    list_display = ('target_model', 'target_id', 'stage', 'actor', 'action', 'created_at')
    list_filter = ('action', 'target_model')
    readonly_fields = ('created_at',)

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'latitude', 'longitude', 'radius_meters', 'timezone')
    search_fields = ('name', 'address')

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'department')

@admin.register(Golongan)
class GolonganAdmin(admin.ModelAdmin):
    list_display = ('name', 'base_salary', 'meal_allowance', 'transport_allowance')

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('nik', 'fullname', 'email', 'branch', 'department', 'role', 'golongan', 'status')
    search_fields = ('nik', 'fullname', 'email')
    list_filter = ('status', 'branch', 'department', 'golongan')
