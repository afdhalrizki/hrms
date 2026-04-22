import pytest
import httpx
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_attendance_platform_policy_enforcement(base_url, tenant1_domain, client):
    """
    Test: Admin sets policy -> Web clock-in fails -> Mobile clock-in succeeds.
    """
    # 1. Login as Admin to change settings
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()["access"]

    # 2. Set Policy to MOBILE ONLY
    settings_url = f"{base_url}/tenant/settings/"
    patch_resp = client.patch(
        settings_url,
        json={"attendance_platform_policy": "MOBILE"},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["attendance_platform_policy"] == "MOBILE"

    # 3. Login as regular employee
    emp_login = client.post(
        f"{base_url}/auth/login/",
        json={"email": "employee1@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert emp_login.status_code == 200
    emp_token = emp_login.json()["access"]
    
    me_resp = client.get(f"{base_url}/users/me/", headers=get_auth_headers(tenant1_domain, emp_token))
    employee_id = me_resp.json().get("employee_id")

    # 4. Attempt Web Clock-in (should fail)
    import random
    from datetime import date, timedelta
    unique_date_web = (date.today() + timedelta(days=random.randint(500, 600))).strftime("%Y-%m-%d")
    
    attendance_url = f"{base_url}/attendance/"
    web_payload = {
        "employee": employee_id,
        "date": unique_date_web,
        "check_in": "08:00:00",
        "latitude_in": -6.2088,
        "longitude_in": 106.8456,
        "platform": "web"
    }
    
    res_web = client.post(attendance_url, json=web_payload, headers=get_auth_headers(tenant1_domain, emp_token))
    assert res_web.status_code == 403
    assert "restricted to the mobile application" in res_web.json()["error"]

    # 5. Attempt Mobile Clock-in (should succeed)
    unique_date_mobile = (date.today() + timedelta(days=random.randint(601, 700))).strftime("%Y-%m-%d")
    mobile_payload = {
        "employee": employee_id,
        "date": unique_date_mobile,
        "check_in": "08:00:00",
        "latitude_in": -6.2088,
        "longitude_in": 106.8456,
        "platform": "mobile"
    }
    
    res_mobile = client.post(attendance_url, json=mobile_payload, headers=get_auth_headers(tenant1_domain, emp_token))
    assert res_mobile.status_code == 201
    assert res_mobile.json()["status"] == "PRESENT"

    # 6. Change Policy back to BOTH and verify Web now works
    client.patch(
        settings_url,
        json={"attendance_platform_policy": "BOTH"},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    
    unique_date_both = (date.today() + timedelta(days=random.randint(701, 800))).strftime("%Y-%m-%d")
    web_payload_both = web_payload.copy()
    web_payload_both["date"] = unique_date_both
    
    res_web_both = client.post(attendance_url, json=web_payload_both, headers=get_auth_headers(tenant1_domain, emp_token))
    assert res_web_both.status_code == 201
