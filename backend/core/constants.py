"""
Canonical list of permissions for the HRMS RBAC system.
These strings are used as keys in the AccessRole.permissions JSONField.
"""

# Management & Settings
MANAGE_SETTINGS = 'manage_settings'
MANAGE_HR = 'manage_hr'
MANAGE_ACCESS_ROLES = 'manage_access_roles'
VIEW_AUDIT_LOGS = 'view_audit_logs'
VIEW_ALL_PAYSLIPS = 'view_all_payslips'
VIEW_PERFORMANCE_REPORT = 'view_performance_report'

# Operational Modules
MANAGE_ATTENDANCE = 'manage_attendance'
MANAGE_PAYROLL = 'manage_payroll'
MANAGE_REIMBURSEMENT = 'manage_reimbursement'
MANAGE_PERFORMANCE = 'manage_performance'

# Approval Workflows
APPROVE_LEAVE = 'approve_leave'
APPROVE_REIMBURSEMENT = 'approve_reimbursement'
APPROVE_ATTENDANCE_CORRECTION = 'approve_attendance_correction'
APPROVE_OVERTIME = 'approve_overtime'

# Permission Pool for UI and Initialization
PERMISSIONS_POOL = {
    MANAGE_SETTINGS: "Can modify tenant branding and system settings",
    MANAGE_HR: "Can manage employees, departments, and roles",
    MANAGE_ACCESS_ROLES: "Can define and assign RBAC roles",
    VIEW_AUDIT_LOGS: "Can view system audit trails",
    VIEW_ALL_PAYSLIPS: "Can view payslips for all employees",
    VIEW_PERFORMANCE_REPORT: "Can view global performance reports",
    MANAGE_ATTENDANCE: "Can manage shifts and view global attendance",
    MANAGE_PAYROLL: "Can calculate salaries and view payslips",
    MANAGE_REIMBURSEMENT: "Can manage reimbursement categories",
    MANAGE_PERFORMANCE: "Can manage appraisal cycles and KPIs",
    APPROVE_LEAVE: "Can approve leave requests",
    APPROVE_REIMBURSEMENT: "Can approve reimbursement claims",
    APPROVE_ATTENDANCE_CORRECTION: "Can approve attendance corrections",
    APPROVE_OVERTIME: "Can approve overtime requests",
}
