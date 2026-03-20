from django.contrib import admin
from .models import KPI, KPITarget, Appraisal, AppraisalReview

@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'unit', 'created_at')
    list_filter = ('category', 'unit')
    search_fields = ('name', 'description')

@admin.register(KPITarget)
class KPITargetAdmin(admin.ModelAdmin):
    list_display = ('employee', 'kpi', 'target_value', 'actual_value', 'period')
    list_filter = ('kpi', 'period', 'employee')
    search_fields = ('employee__fullname', 'kpi__name')
    date_hierarchy = 'period'

class AppraisalReviewInline(admin.TabularInline):
    model = AppraisalReview
    extra = 1
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Appraisal)
class AppraisalAdmin(admin.ModelAdmin):
    list_display = ('employee', 'period_name', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'period_name')
    search_fields = ('employee__fullname', 'period_name')
    inlines = [AppraisalReviewInline]
    date_hierarchy = 'start_date'

@admin.register(AppraisalReview)
class AppraisalReviewAdmin(admin.ModelAdmin):
    list_display = ('appraisal', 'reviewer', 'reviewer_type', 'created_at')
    list_filter = ('reviewer_type', 'created_at')
    search_fields = ('appraisal__employee__fullname', 'reviewer__fullname')
