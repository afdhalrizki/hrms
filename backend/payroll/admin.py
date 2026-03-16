from django.contrib import admin
from .models import SalaryComponent, PayrollPeriod, Payslip, PayslipDetail

@admin.register(SalaryComponent)
class SalaryComponentAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'is_taxable')
    list_filter = ('type', 'is_taxable')

@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ('month', 'year', 'start_date', 'end_date', 'is_closed')
    list_filter = ('year', 'is_closed')

class PayslipDetailInline(admin.TabularInline):
    model = PayslipDetail
    extra = 1

@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ('employee', 'period', 'basic_salary', 'net_pay')
    search_fields = ('employee__fullname',)
    list_filter = ('period',)
    inlines = [PayslipDetailInline]
