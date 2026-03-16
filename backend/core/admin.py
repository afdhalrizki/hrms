from django.contrib import admin
from .models import Department, Role, Golongan, Employee

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
    list_display = ('nik', 'fullname', 'email', 'department', 'role', 'golongan', 'status', 'face_reference')
    search_fields = ('nik', 'fullname', 'email')
    list_filter = ('status', 'department', 'golongan')
