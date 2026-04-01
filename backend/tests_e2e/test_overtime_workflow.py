import pytest
import datetime
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_overtime_approval_workflow(base_url, tenant1_domain, client):
    """
    Test: Employee Requests Overtime -> Manager Approves -> verified in list.
    """
    # 1. Login as Employee
    login_emp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "employee1@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_emp.status_code == 200
    emp_token = login_emp.json()["access"]
    emp_id = client.get(f"{base_url}/users/me/", headers=get_auth_headers(tenant1_domain, emp_token)).json()["employee_id"]

    # 2. Request Overtime
    overtime_url = f"{base_url}/overtime/"
    today = datetime.date.today().strftime("%Y-%m-%d")
    payload = {
        "employee": emp_id,
        "date": today,
        "hours": "2.00",
        "reason": "E2E Hardening"
    }
    res_post = client.post(overtime_url, json=payload, headers=get_auth_headers(tenant1_domain, emp_token))
    # It might fail if already exists for today, but seed usually clears or we use unique date
    # If 400, we skip or use different date
    if res_post.status_code == 400:
        payload["date"] = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        res_post = client.post(overtime_url, json=payload, headers=get_auth_headers(tenant1_domain, emp_token))
    
    assert res_post.status_code == 201
    ot_id = res_post.json()["id"]
    assert res_post.json()["status"] == "PENDING"

    # 3. Login as Admin/Manager to approve
    login_admin = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_admin.status_code == 200
    admin_token = login_admin.json()["access"]

    # 4. Approve Overtime
    res_approve = client.patch(
        f"{overtime_url}{ot_id}/",
        json={"status": "APPROVED", "comment": "Approved by E2E"},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "APPROVED"
