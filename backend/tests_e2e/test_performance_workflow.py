import pytest
import datetime
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_performance_appraisal_workflow(base_url, tenant1_domain, client):
    """
    Test: Admin creates appraisal -> Employee submits self-review -> Manager reviews.
    """
    # 1. Login as Admin
    login_admin = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    admin_token = login_admin.json()["access"]
    admin_id = client.get(f"{base_url}/users/me/", headers=get_auth_headers(tenant1_domain, admin_token)).json()["employee_id"]

    # 2. Get Employee ID
    login_emp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "employee1@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    emp_token = login_emp.json()["access"]
    emp_id = client.get(f"{base_url}/users/me/", headers=get_auth_headers(tenant1_domain, emp_token)).json()["employee_id"]

    # 3. Create Appraisal (Admin)
    appraisal_url = f"{base_url}/appraisals/"
    payload = {
        "employee": emp_id,
        "period_name": "Q1 2026",
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "status": "DRAFT"
    }
    res_appr = client.post(appraisal_url, json=payload, headers=get_auth_headers(tenant1_domain, admin_token))
    assert res_appr.status_code == 201
    appr_id = res_appr.json()["id"]

    # 4. Activate Appraisal
    client.patch(f"{appraisal_url}{appr_id}/", json={"status": "IN_PROGRESS"}, headers=get_auth_headers(tenant1_domain, admin_token))

    # 5. Create Self Review (Employee)
    review_url = f"{base_url}/appraisal-reviews/"
    review_payload = {
        "appraisal": appr_id,
        "reviewer": emp_id,
        "reviewer_type": "SELF",
        "ratings": {"productivity": 4, "teamwork": 5},
        "comments": "I did well"
    }
    res_self = client.post(review_url, json=review_payload, headers=get_auth_headers(tenant1_domain, emp_token))
    assert res_self.status_code == 201

    # 6. Create Manager Review (Admin/Manager)
    mgr_payload = {
        "appraisal": appr_id,
        "reviewer": admin_id,
        "reviewer_type": "MANAGER",
        "ratings": {"productivity": 4, "teamwork": 4},
        "comments": "Agreed"
    }
    res_mgr = client.post(review_url, json=mgr_payload, headers=get_auth_headers(tenant1_domain, admin_token))
    assert res_mgr.status_code == 201

    # 7. Complete Appraisal (Admin)
    res_final = client.patch(f"{appraisal_url}{appr_id}/", json={"status": "COMPLETED"}, headers=get_auth_headers(tenant1_domain, admin_token))
    assert res_final.status_code == 200
    assert res_final.json()["status"] == "COMPLETED"
