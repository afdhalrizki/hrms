import pytest
import httpx
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_reporting_flow_e2e(base_url, tenant1_domain, client):
    """
    E2E Test for Reporting Flow:
    1. Login as Admin
    2. Download Attendance XLSX
    3. Download Payroll DOCX
    4. Download Performance XLSX
    """
    # 1. Login
    login_resp = client.post(
        f"{base_url}/auth/login/",
        json={"email": "admin@company1.com", "password": "password123"},
        headers=get_auth_headers(tenant1_domain)
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access"]
    headers = get_auth_headers(tenant1_domain, token)

    # 2. Attendance XLSX Recap
    attendance_xlsx_url = f"{base_url}/attendance/export_xlsx/"
    resp = client.get(attendance_xlsx_url, headers=headers)
    if resp.status_code != 200:
        with open("error_body.html", "w") as f: f.write(resp.text)
    assert resp.status_code == 200, f"Attendance XLSX failed with {resp.status_code}"

    # 3. Payroll DOCX (Payslip)
    payslip_resp = client.get(f"{base_url}/payslips/", headers=headers)
    assert payslip_resp.status_code == 200
    payslips = payslip_resp.json()
    if payslips:
        payslip_id = payslips[0]["id"]
        payroll_docx_url = f"{base_url}/payslips/{payslip_id}/download_docx/"
        resp = client.get(payroll_docx_url, headers=headers)
        if resp.status_code != 200:
            with open("error_body.html", "w") as f: f.write(resp.text)
        assert resp.status_code == 200, f"Payroll DOCX failed: {resp.status_code}"

    # 4. Performance XLSX
    perf_xlsx_url = f"{base_url}/appraisals/export_xlsx/"
    resp = client.get(perf_xlsx_url, headers=headers)
    if resp.status_code != 200:
        with open("error_body.html", "w") as f: f.write(resp.text)
    assert resp.status_code == 200, f"Performance XLSX failed: {resp.status_code}"

    # 5. Reimbursement XLSX
    reimb_xlsx_url = f"{base_url}/reimbursements/export_xlsx/"
    resp = client.get(reimb_xlsx_url, headers=headers)
    if resp.status_code != 200:
        with open("error_body.html", "w") as f: f.write(resp.text)
    assert resp.status_code == 200, f"Reimbursement XLSX failed: {resp.status_code}"
