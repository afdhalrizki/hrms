import pytest
from datetime import date, timedelta
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_attendance_absence_automation_e2e(base_url, tenant1_domain, client):
    """
    Test: Admin sets schedule for employee -> Runs check-absences -> Employee gets marked as ABSENT.
    """
    # 1. Login as Admin
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()["access"]

    # 2. Get Employee 1 ID
    emp_resp = client.get(
        f"{base_url}/employees/?nik=EMP001",
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert emp_resp.status_code == 200
    employees = emp_resp.json()
    assert len(employees) > 0
    employee_id = employees[0]["id"]

    # 3. Create a schedule for a future date (to avoid collisions)
    test_date = (date.today() + timedelta(days=95)).strftime("%Y-%m-%d")
    
    # Get shifts list to find morning shift or any shift
    shift_resp = client.get(
        f"{base_url}/shifts/",
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert shift_resp.status_code == 200
    shifts = shift_resp.json()
    assert len(shifts) > 0
    shift_id = shifts[0]["id"]

    # 3.5 CLEANUP: Delete any pre-existing schedule on this date
    sched_list = client.get(
        f"{base_url}/schedules/?employee_id={employee_id}&date={test_date}",
        headers=get_auth_headers(tenant1_domain, admin_token)
    ).json()
    if isinstance(sched_list, list):
        for s in sched_list:
            client.delete(f"{base_url}/schedules/{s['id']}/", headers=get_auth_headers(tenant1_domain, admin_token))
    
    # Also delete any pre-existing attendance on this date
    att_list = client.get(
        f"{base_url}/attendance/?employee_id={employee_id}&date={test_date}",
        headers=get_auth_headers(tenant1_domain, admin_token)
    ).json()
    if isinstance(att_list, list):
        for a in att_list:
            client.delete(f"{base_url}/attendance/{a['id']}/", headers=get_auth_headers(tenant1_domain, admin_token))

    # Create schedule
    sched_resp = client.post(
        f"{base_url}/schedules/",
        json={
            "employee": employee_id,
            "shift": shift_id,
            "date": test_date
        },
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert sched_resp.status_code == 201, f"Failed to create schedule: {sched_resp.text}"

    # 4. Trigger check-absences endpoint
    check_resp = client.post(
        f"{base_url}/attendance/check-absences/",
        json={"date": test_date},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert check_resp.status_code == 200
    assert check_resp.json()["status"] == "success"

    # 5. Verify that Attendance record with ABSENT status was created for this date
    att_resp = client.get(
        f"{base_url}/attendance/?employee_id={employee_id}&date={test_date}",
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert att_resp.status_code == 200
    attendances = att_resp.json()
    assert len(attendances) == 1
    assert attendances[0]["status"] == "ABSENT"

    # CLEANUP: Delete the schedule and the attendance to keep DB clean
    att_id = attendances[0]["id"]
    client.delete(f"{base_url}/attendance/{att_id}/", headers=get_auth_headers(tenant1_domain, admin_token))
    
    sched_id = sched_resp.json()["id"]
    client.delete(f"{base_url}/schedules/{sched_id}/", headers=get_auth_headers(tenant1_domain, admin_token))
