from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from .models import Tenant, Domain

@admin.register(Tenant)
class TenantAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'created_on', 'auto_create_schema')

@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'tenant', 'is_primary')
