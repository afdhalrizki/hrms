"""
Canonical list of permissions for the HRMS RBAC system.
These strings are used as keys in the AccessRole.permissions JSONField.
"""

# Management & Settings
TENANT_MANAGE_SETTINGS = 'tenant_manage_settings'
TENANT_MANAGE_HR = 'tenant_manage_hr'
TENANT_MANAGE_ACCESS_ROLES = 'tenant_manage_access_roles'
TENANT_VIEW_AUDIT_LOGS = 'tenant_view_audit_logs'
TENANT_VIEW_ALL_PAYSLIPS = 'tenant_view_all_payslips'
TENANT_VIEW_PERFORMANCE_REPORT = 'tenant_view_performance_report'

# Operational Modules
TENANT_MANAGE_ATTENDANCE = 'tenant_manage_attendance'
TENANT_MANAGE_PAYROLL = 'tenant_manage_payroll'
TENANT_MANAGE_REIMBURSEMENT = 'tenant_manage_reimbursement'
TENANT_MANAGE_PERFORMANCE = 'tenant_manage_performance'

# Approval Workflows
TENANT_APPROVE_LEAVE = 'tenant_approve_leave'
TENANT_APPROVE_REIMBURSEMENT = 'tenant_approve_reimbursement'
TENANT_APPROVE_ATTENDANCE_CORRECTION = 'tenant_approve_attendance_correction'
TENANT_APPROVE_OVERTIME = 'tenant_approve_overtime'

# Permission Pool for UI and Initialization
PERMISSIONS_POOL = {
    TENANT_MANAGE_SETTINGS: "Can modify tenant branding and system settings",
    TENANT_MANAGE_HR: "Can manage employees, departments, and roles",
    TENANT_MANAGE_ACCESS_ROLES: "Can define and assign RBAC roles",
    TENANT_VIEW_AUDIT_LOGS: "Can view system audit trails",
    TENANT_VIEW_ALL_PAYSLIPS: "Can view payslips for all employees",
    TENANT_VIEW_PERFORMANCE_REPORT: "Can view global performance reports",
    TENANT_MANAGE_ATTENDANCE: "Can manage shifts and view global attendance",
    TENANT_MANAGE_PAYROLL: "Can calculate salaries and view payslips",
    TENANT_MANAGE_REIMBURSEMENT: "Can manage reimbursement categories",
    TENANT_MANAGE_PERFORMANCE: "Can manage appraisal cycles and KPIs",
    TENANT_APPROVE_LEAVE: "Can approve leave requests",
    TENANT_APPROVE_REIMBURSEMENT: "Can approve reimbursement claims",
    TENANT_APPROVE_ATTENDANCE_CORRECTION: "Can approve attendance corrections",
    TENANT_APPROVE_OVERTIME: "Can approve overtime requests",
}
