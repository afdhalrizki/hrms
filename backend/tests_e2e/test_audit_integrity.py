import pytest
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_employee_update_triggers_audit_log(base_url, tenant1_domain, client):
    """
    Test: Admin updates an employee -> Check if AuditLog entry exists via API.
    """
    # 1. Login as Admin
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access"]

    # 2. Find Employee 1
    emp_resp = client.get(
        f"{base_url}/employees/?nik=EMP001",
        headers=get_auth_headers(tenant1_domain, token)
    )
    employee = emp_resp.json()[0]
    emp_id = employee["id"]
    old_fullname = employee["fullname"]
    new_fullname = f"{old_fullname} - Updated"

    # 3. Perform Update
    update_resp = client.patch(
        f"{base_url}/employees/{emp_id}/",
        json={"fullname": new_fullname},
        headers=get_auth_headers(tenant1_domain, token)
    )
    assert update_resp.status_code == 200

    # 4. Verify Audit Log via API
    # The AuditLogger.log_change happens in perform_update.
    # We query /api/audit-logs/
    audit_resp = client.get(
        f"{base_url}/audit-logs/?model_name=Employee&object_id={emp_id}",
        headers=get_auth_headers(tenant1_domain, token)
    )
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    
    # Check if there is an UPDATE log for this employee
    update_logs = [l for l in logs if l["action_type"] == "UPDATE" and str(l["object_id"]) == str(emp_id)]
    assert len(update_logs) >= 1
    
    latest_log = update_logs[0]
    assert latest_log["model_name"] == "Employee"
    
    # Check changed fields
    changed = latest_log["changed_fields"]
    assert "fullname" in changed
    assert changed["fullname"]["old"] == old_fullname
    assert changed["fullname"]["new"] == new_fullname

@pytest.mark.e2e
def test_unauthorized_user_cannot_view_audit_logs(base_url, tenant1_domain, client):
    """
    Test: Regular employee should be blocked from seeing audit logs.
    """
    # 1. Login as Employee
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "employee1@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    token = login_resp.json()["access"]

    # 2. Attempt to fetch audit logs
    audit_resp = client.get(
        f"{base_url}/audit-logs/",
        headers=get_auth_headers(tenant1_domain, token)
    )
    # Depending on RBAC, it should return 403 Forbidden or empty list if filtered
    # In our AuditLogViewSet, required_rbac_permission = 'view_audit_logs'
    # Regular employees (Staff role) don't have this.
    assert audit_resp.status_code in [403, 401]
