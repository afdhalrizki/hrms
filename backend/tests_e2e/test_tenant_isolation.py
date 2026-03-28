import pytest
import httpx
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_cross_tenant_token_rejection(base_url, tenant1_domain, tenant2_domain, client):
    """
    Verify that a token issued for Tenant A is rejected by Tenant B.
    """
    # 1. Login to Tenant 1
    login_url = f"{base_url}/auth/login/"
    login_data = {
        "email": "admin@company1.com",
        "password": "password123"
    }
    
    # We use auth/login/ which we corrected in Mobile phase
    resp1 = client.post(login_url, json=login_data, headers=get_auth_headers(tenant1_domain))
    assert resp1.status_code == 200, f"Login failed: {resp1.text}"
    token = resp1.json().get("access") or resp1.json().get("token")
    
    # 2. Attempt to use this token on Tenant 2
    # Even if the user exists in both, the tenant context should fail or the user shouldn't exist in Tenant 2's schema
    profile_url = f"{base_url}/users/me/" # Assuming there's a /me/ endpoint
    resp2 = client.get(profile_url, headers=get_auth_headers(tenant2_domain, token))
    
    # It should be 401 Unauthorized or 404 depending on how the middleware handles it
    assert resp2.status_code in [401, 403, 404]

@pytest.mark.e2e
def test_data_isolation_employees(base_url, tenant1_domain, tenant2_domain, client):
    """
    Verify that querying employees on Tenant 1 does not return Tenant 2 data.
    """
    # 1. Get token for Tenant 1
    resp1 = client.post(f"{base_url}/auth/login/", 
                       json={"email": "admin@company1.com", "password": "password123"},
                       headers=get_auth_headers(tenant1_domain))
    token1 = resp1.json()["access"]
    
    # 2. Get employees from Tenant 1
    resp_emp = client.get(f"{base_url}/employees/", headers=get_auth_headers(tenant1_domain, token1))
    assert resp_emp.status_code == 200
    
    # 3. Verify all returned employees belong to company1 (contextually)
    # In a real E2E, we'd check if any returned NIK/Email belongs to Tenant 2 seeded data
    employees = resp_emp.json()
    for emp in employees:
        assert "company2" not in emp.get("email", "")


@pytest.mark.e2e
def test_cross_tenant_payslip_invisibility(base_url, tenant1_domain, tenant2_domain, client):
    """
    Ensure that payslips created in Tenant 1 are not visible in Tenant 2.
    """
    # 1. Generate at least one payslip in tenant1
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()["access"]

    # Ensure a payroll period exists or create one
    period_resp = client.post(
        f"{base_url}/payroll-periods/",
        json={"month": 3, "year": 2026, "start_date": "2026-03-01", "end_date": "2026-03-31"},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert period_resp.status_code in [200, 201]
    period_id = period_resp.json()["id"]

    generate_resp = client.post(
        f"{base_url}/payslips/generate/",
        json={"period_id": period_id},
        headers=get_auth_headers(tenant1_domain, admin_token)
    )
    assert generate_resp.status_code == 200

    # 2. Tenant 2 admin should not see those payslips
    login_resp2 = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company2.com", "password": "password123"},
        headers=get_auth_headers(tenant2_domain)
    )
    assert login_resp2.status_code == 200
    admin2_token = login_resp2.json()["access"]

    payslips_t2 = client.get(
        f"{base_url}/payslips/",
        headers=get_auth_headers(tenant2_domain, admin2_token)
    )
    assert payslips_t2.status_code == 200
    assert len(payslips_t2.json()) == 0

