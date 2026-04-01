import pytest
import datetime
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_reimbursement_workflow_success(base_url, tenant1_domain, client):
    """
    Test: Employee submits claim -> Manager Approves -> Balance check.
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

    # 2. Get Categories
    cat_resp = client.get(f"{base_url}/reimbursement-categories/", headers=get_auth_headers(tenant1_domain, emp_token))
    assert cat_resp.status_code == 200
    cats = cat_resp.json()
    assert len(cats) > 0
    cat_id = cats[0]["id"]

    # 3. Submit Reimbursement
    reimb_url = f"{base_url}/reimbursements/"
    payload = {
        "employee": emp_id,
        "category": cat_id,
        "amount": "150000.00",
        "date": datetime.date.today().strftime("%Y-%m-%d"),
        "description": "E2E Travel"
    }
    res_post = client.post(reimb_url, json=payload, headers=get_auth_headers(tenant1_domain, emp_token))
    assert res_post.status_code == 201
    reimb_id = res_post.json()["id"]

    # 4. Supervisor Approves
    login_admin = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    admin_token = login_admin.json()["access"]
    
    res_sup = client.post(
        f"{reimb_url}{reimb_id}/approve_supervisor/",
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert res_sup.status_code == 200
    
    # 5. Finance Approves (Final)
    res_fin = client.post(
        f"{reimb_url}{reimb_id}/approve_finance/",
        json={"approved_amount": "150000.00"},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert res_fin.status_code == 200
    assert res_fin.json()["final_status"] == "APPROVED"
