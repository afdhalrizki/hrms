"""
Canonical list of roles and permissions for the Global (Master Tenant) RBAC system.
"""

# 1. Definisi Role
ROLE_SUPERADMIN = 'SUPERADMIN'
ROLE_ONBOARDING = 'ONBOARDING_AGENT'
ROLE_SUPPORT = 'SUPPORT_AGENT'
ROLE_BILLING = 'BILLING_ADMIN'

GLOBAL_ROLE_CHOICES = [
    (ROLE_SUPERADMIN, 'Super Administrator'),
    (ROLE_ONBOARDING, 'Onboarding & Sales'),
    (ROLE_SUPPORT, 'Customer Support'),
    (ROLE_BILLING, 'Billing & Finance'),
]

# 2. Definisi Global Permissions
GLOBAL_MANAGE_TENANTS = 'global_manage_tenants' # Approve/Reject/Create
GLOBAL_MASQUERADE = 'global_masquerade'         # Masuk ke dasbor klien
GLOBAL_MANAGE_BILLING = 'global_manage_billing' # Ubah paket/suspend
GLOBAL_MANAGE_USERS = 'global_manage_users'     # Buat akun admin baru

# 3. Role-to-Permission Mapping
GLOBAL_ROLE_PERMISSIONS = {
    ROLE_SUPERADMIN: [GLOBAL_MANAGE_TENANTS, GLOBAL_MASQUERADE, GLOBAL_MANAGE_BILLING, GLOBAL_MANAGE_USERS],
    ROLE_ONBOARDING: [GLOBAL_MANAGE_TENANTS],
    ROLE_SUPPORT: [GLOBAL_MASQUERADE],
    ROLE_BILLING: [GLOBAL_MANAGE_BILLING],
}
