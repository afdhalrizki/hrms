import pytest
from .conftest import get_auth_headers

@pytest.mark.e2e
def test_subscription_registration_to_activation_e2e(base_url, client):
    """
    E2E: Menguji alur dari pendaftaran publik -> persetujuan admin -> verifikasi tanggal kadaluarsa otomatis.
    """
    # 1. Pendaftaran Publik
    import time
    unique_suffix = int(time.time())
    subdomain = f"e2e-life-{unique_suffix}"
    
    signup_url = f"{base_url}/public/signup/"
    signup_data = {
        "company_name": f"E2E Lifecycle Corp {unique_suffix}",
        "subdomain_prefix": subdomain,
        "admin_email": f"admin@{subdomain}.com"
    }
    resp_signup = client.post(signup_url, json=signup_data)
    assert resp_signup.status_code == 201, f"Signup failed: {resp_signup.status_code} - {resp_signup.text}"
    
    # 2. Persetujuan oleh Super Admin
    login_url = f"{base_url}/auth/login/"
    master_admin_data = {"email": "superadmin@harikerja.com", "password": "password123"}
    # Pastikan Host header benar untuk public schema
    master_headers = {"X-Tenant-Domain": "public", "Host": "localhost:8000"}
    resp_master = client.post(login_url, json=master_admin_data, headers=master_headers)
    assert resp_master.status_code == 200, f"Master Login failed: {resp_master.text}"
    
    master_token = resp_master.json().get("access") or resp_master.json().get("token")
    assert master_token, "No token found in master login response"
    
    # Ambil ID pendaftaran terakhir
    reg_list_url = f"{base_url}/internal/registrations/"
    auth_headers = get_auth_headers("public", master_token)
    resp_list = client.get(reg_list_url, headers=auth_headers)
    
    # DEBUG: Jika gagal JSON, cetak status dan body
    assert resp_list.status_code == 200, f"Failed to fetch registrations. Status: {resp_list.status_code}, Body: {resp_list.text}"
    
    registrations = resp_list.json()
    # Cari pendaftaran yang barusan dibuat
    try:
        reg_id = next(r["id"] for r in registrations if r["subdomain_prefix"] == subdomain)
    except (StopIteration, KeyError):
        pytest.fail(f"Could not find registration with prefix '{subdomain}' in {registrations}")
    
    # Klik Approve
    approve_url = f"{base_url}/internal/registrations/{reg_id}/approve/"
    resp_approve = client.post(approve_url, headers=auth_headers)
    assert resp_approve.status_code == 200, f"Approval failed: {resp_approve.text}"
    
    # 3. Login ke Tenant yang baru dibuat
    tenant_domain = f"{subdomain}.localhost"
    tenant_login_headers = get_auth_headers(tenant_domain)
    # Password default saat aktivasi adalah 'change-me-123'
    resp_tenant_login = client.post(login_url, 
                                  json={"email": f"admin@{subdomain}.com", "password": "change-me-123"},
                                  headers=tenant_login_headers)
    assert resp_tenant_login.status_code == 200, f"Tenant Login failed: {resp_tenant_login.text}"
    
    tenant_token = resp_tenant_login.json().get("access") or resp_tenant_login.json().get("token")
    
    # 4. Verifikasi bahwa expiry_date sudah terisi otomatis di Settings
    settings_url = f"{base_url}/tenant/settings/"
    resp_settings = client.get(settings_url, headers=get_auth_headers(tenant_domain, tenant_token))
    assert resp_settings.status_code == 200, f"Settings fetch failed: {resp_settings.text}"
    
    settings_data = resp_settings.json()
    assert settings_data.get("expiry_date") is not None, "Expiry date harus terisi otomatis saat approval"
    assert settings_data.get("subscription_status") == "ACTIVE"
