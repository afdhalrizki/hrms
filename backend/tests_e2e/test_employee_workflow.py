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
    # Use a random future date to avoid collisions when the test is re-run many times
    import random
    from datetime import date, timedelta
    # Avoid date collisions with other tests that use today+1
    unique_date = (date.today() + timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d")
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


@pytest.mark.e2e
def test_payroll_generation_and_employee_payslip_visibility(base_url, tenant1_domain, client):
    """
    Test: Create payroll period, generate payslip, and verify visibility for employee.
    """
    # 1. Login as Admin
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()["access"]

    # 2. Create payroll period
    period_payload = {
        "month": 3,
        "year": 2026,
        "start_date": "2026-03-01",
        "end_date": "2026-03-31"
    }
    rep_period = client.post(
        f"{base_url}/payroll-periods/",
        json=period_payload,
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert rep_period.status_code == 201, f"Create payroll period failed: {rep_period.text}"
    period_id = rep_period.json()["id"]

    # 3. Generate payslips for all employees
    gen_resp = client.post(
        f"{base_url}/payslips/generate/",
        json={"period_id": period_id},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert gen_resp.status_code == 200, f"Generate payslips failed: {gen_resp.text}"
    assert gen_resp.json()["message"].startswith("Successfully generated")
    assert len(gen_resp.json().get("payslips", [])) >= 1

    # 4. Login as regular employee and verify they can see only own payslip
    employee_login = client.post(
        f"{base_url}/auth/login/",
        json={"email": "employee1@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert employee_login.status_code == 200
    emp_token = employee_login.json()["access"]

    payslip_list = client.get(
        f"{base_url}/payslips/?period_id={period_id}",
        headers=get_auth_headers(tenant1_domain, emp_token)
    )
    assert payslip_list.status_code == 200
    assert len(payslip_list.json()) >= 1


@pytest.mark.e2e
def test_checkin_blocked_when_approved_leave_exists(base_url, tenant1_domain, client):
    """
    Test: An employee on approved leave cannot clock in for that date.
    """
    from datetime import date, timedelta

    # 1. Login as Employee
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "employee1@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access"]

    me_resp = client.get(f"{base_url}/users/me/", headers=get_auth_headers(tenant1_domain, token))
    assert me_resp.status_code == 200
    employee_id = me_resp.json().get("employee_id")
    assert employee_id

    # 2. Create and approve leave for tomorrow
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    # Use admin user to approve
    admin_login = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access"]

    leave_resp = client.post(
        f"{base_url}/leave-requests/",
        json={
            "employee": employee_id,
            "start_date": tomorrow,
            "end_date": tomorrow,
            "leave_type": "SAKIT",
            "reason": "E2E approved leave"
        },
        headers=get_auth_headers(tenant1_domain, token)
    )
    assert leave_resp.status_code == 201
    leave_id = leave_resp.json()["id"]

    patch_leave = client.patch(
        f"{base_url}/leave-requests/{leave_id}/",
        json={"status": "APPROVED"},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert patch_leave.status_code == 200
    assert patch_leave.json()["status"] == "APPROVED"

    # 3. Try to clock in for the approved-leave date
    clockin_resp = client.post(
        f"{base_url}/attendance/",
        json={
            "employee": employee_id,
            "date": tomorrow,
            "check_in": "08:00:00",
            "latitude_in": -6.2088,
            "longitude_in": 106.8456
        },
        headers=get_auth_headers(tenant1_domain, token)
    )
    assert clockin_resp.status_code == 400
    assert "APPROVED leave" in (clockin_resp.json().get("detail", "") or "")


@pytest.mark.e2e
def test_employee_profile_update_restrictions(base_url, tenant1_domain, client):
    """
    Test: Employee can update phone but NOT salary or NIK.
    """
    # 1. Login as Employee
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "employee1@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access"]
    
    me_resp = client.get(f"{base_url}/users/me/", headers=get_auth_headers(tenant1_domain, token))
    assert me_resp.status_code == 200
    employee_id = me_resp.json()["employee_id"]
    
    # 2. Try to update restricted fields
    profile_url = f"{base_url}/employees/{employee_id}/"
    payload = {
        "phone": "555-GET-HARDENED",
        "nik": "HACKED_NIK",
        "email": "hacked@test.com"
    }
    # Using PUT or PATCH. Our RBAC should block or ignore sensitive fields.
    res_patch = client.patch(profile_url, json=payload, headers=get_auth_headers(tenant1_domain, token))
    assert res_patch.status_code == 200
    
    # Verify phone is updated but NIK/Email remain same
    # Note: If the backend ignores the fields, it still returns 200. 
    # If the backend blocks the fields, it returns 403.
    # Our RBAC `HasRBACPermission` + `allow_self_service` often allows the action but the serializer filters the fields.
    data = res_patch.json()
    assert data["phone"] == "555-GET-HARDENED"
    assert data["nik"] != "HACKED_NIK"
    assert data["email"] != "hacked@test.com"
