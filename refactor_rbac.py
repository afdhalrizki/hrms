import os
import re

ROOT_DIR = '/home/afdhal/data/hr/hrms'
BACKEND_DIR = os.path.join(ROOT_DIR, 'backend')
FRONTEND_DIR = os.path.join(ROOT_DIR, 'frontend')
MOBILE_DIR = os.path.join(ROOT_DIR, 'mobile')

CONSTANTS = [
    'manage_settings',
    'manage_hr',
    'manage_access_roles',
    'view_audit_logs',
    'view_all_payslips',
    'view_performance_report',
    'manage_attendance',
    'manage_payroll',
    'manage_reimbursement',
    'manage_performance',
    'approve_leave',
    'approve_reimbursement',
    'approve_attendance_correction',
    'approve_overtime'
]

def replace_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    
    # 1. HasRBACPermission -> HasTenantRBACPermission
    new_content = re.sub(r'\bHasRBACPermission\b', 'HasTenantRBACPermission', new_content)
    
    # 2. String literal and Variable replacements
    for c in CONSTANTS:
        upper_c = c.upper()
        # Replace python variable usages: e.g. MANAGE_SETTINGS -> TENANT_MANAGE_SETTINGS
        new_content = re.sub(r'(?<!TENANT_)\b' + upper_c + r'\b', 'TENANT_' + upper_c, new_content)
        
        # Replace string literal exactly
        new_content = re.sub(r"'" + c + r"'", "'tenant_" + c + "'", new_content)
        new_content = re.sub(r'"' + c + r'"', '"tenant_' + c + '"', new_content)
        
        # Catch other usages (like JS object properties: user.permissions.manage_settings)
        # Using negative lookbehind to avoid double prefixing
        new_content = re.sub(r'(?<!tenant_)(?<!TENANT_)\b' + c + r'\b', 'tenant_' + c, new_content)
        
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def process_directory(directory):
    count = 0
    for root, dirs, files in os.walk(directory):
        # ignore node_modules, .git, __pycache__, venv, etc
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__', 'venv', 'coverage', '.next', '.pytest_cache']]
        for file in files:
            if file.endswith(('.py', '.tsx', '.ts', '.js', '.jsx')):
                file_path = os.path.join(root, file)
                try:
                    if replace_in_file(file_path):
                        print(f"Updated: {file_path}")
                        count += 1
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
    return count

if __name__ == '__main__':
    print("Starting refactor...")
    c1 = process_directory(BACKEND_DIR)
    c2 = process_directory(FRONTEND_DIR)
    c3 = process_directory(MOBILE_DIR)
    print(f"Updated {c1} backend files, {c2} frontend files, and {c3} mobile files.")
    
    # Rename HasRBACPermission file if needed. But it's inside core/permissions.py, so it's fine as a class rename.
