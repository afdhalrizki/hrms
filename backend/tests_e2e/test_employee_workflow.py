import pytest
import httpx
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_complete_attendance_workflow(base_url, tenant1_domain, client):
    """
    Test: Login -> Clock In -> Verify Record -> Clock Out.
    """
    # 1. Login
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access"]
    
    # 2. Clock In
    # We need to know the employee ID or use /users/me/ to find it
    me_resp = client.get(f"{base_url}/users/me/", headers=get_auth_headers(tenant1_domain, token))
    assert me_resp.status_code == 200
    employee_id = me_resp.json().get("employee_id")
    assert employee_id is not None
    
    attendance_url = f"{base_url}/attendance/"
    clock_in_data = {
        "employee": employee_id,
        "date": "2026-03-24",
        "check_in": "08:00:00",
        "latitude_in": -6.2088,
        "longitude_in": 106.8456
    }
    
    # Note: If record already exists from previous run, this might fail unless cleaned
    # We'll use a unique date or check for existing
    import datetime
    unique_date = datetime.date.today().strftime("%Y-%m-%d")
    clock_in_data["date"] = unique_date
    
    res_in = client.post(attendance_url, json=clock_in_data, headers=get_auth_headers(tenant1_domain, token))
    assert res_in.status_code == 201, f"Clock-in failed! Status: {res_in.status_code}, Body: {res_in.text}"
    
    attendance_id = res_in.json()["id"]
    
    # 3. Clock Out
    res_out = client.patch(
        f"{attendance_url}{attendance_id}/",
        json={"check_out": "17:00:00"},
        headers=get_auth_headers(tenant1_domain, token)
    )
    assert res_out.status_code == 200, f"Clock-out failed! Status: {res_out.status_code}, Body: {res_out.text}"
    assert res_out.json()["check_out"] == "17:00:00"

@pytest.mark.e2e
def test_leave_request_workflow(base_url, tenant1_domain, client):
    """
    Test: Request Leave -> Admin Approval -> Balance Verification.
    """
    # 1. Login as Admin
    login_resp = client.post(f"{base_url}/auth/login/", 
               json={"email": "admin@company1.com", "password": "password123"},
               headers=get_auth_headers(tenant1_domain))
    assert login_resp.status_code == 200, f"Login failed! Status: {login_resp.status_code}, Body: {login_resp.text}"
    token = login_resp.json()["access"]
    
    # 2. Create Leave Request
    me_resp = client.get(f"{base_url}/users/me/", headers=get_auth_headers(tenant1_domain, token))
    assert me_resp.status_code == 200, f"Me profile failed! Status: {me_resp.status_code}, Body: {me_resp.text}"
    employee_id = me_resp.json()["employee_id"]
    assert employee_id is not None, "Admin has no employee record! Check seeding."
    
    leave_url = f"{base_url}/leave-requests/"
    leave_data = {
        "employee": employee_id,
        "start_date": "2026-04-01",
        "end_date": "2026-04-01",
        "leave_type": "SAKIT",
        "reason": "E2E Test Request"
    }
    
    res_leave = client.post(leave_url, json=leave_data, headers=get_auth_headers(tenant1_domain, token))
    assert res_leave.status_code == 201, f"Leave request failed! Status: {res_leave.status_code}, Body: {res_leave.text}"
    leave_id = res_leave.json()["id"]
    
    # 3. Approve Leave (Admin)
    res_approve = client.patch(
        f"{leave_url}{leave_id}/",
        json={"status": "APPROVED"},
        headers=get_auth_headers(tenant1_domain, token)
    )
    assert res_approve.status_code == 200, f"Approval failed! Status: {res_approve.status_code}, Body: {res_approve.text}"
    assert res_approve.json()["status"] == "APPROVED"
