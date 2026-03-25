import httpx
import json

base_url = "http://127.0.0.1:8000/api"
domain = "company1.localhost"

def get_auth_headers(token=None):
    headers = {
        "X-Tenant-Domain": domain,
        "Host": f"{domain}:8000",
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers

client = httpx.Client(timeout=10.0)

# 1. Login
print("Logging in...")
login_resp = client.post(
    f"{base_url}/auth/login/",
    json={"email": "admin@company1.com", "password": "password123"},
    headers=get_auth_headers()
)
token = login_resp.json()["access"]

# 2. Get me
me_resp = client.get(f"{base_url}/users/me/", headers=get_auth_headers(token))
employee_id = me_resp.json()["employee_id"]

# 3. Create Leave
print("Creating leave...")
leave_resp = client.post(
    f"{base_url}/leave-requests/",
    json={
        "employee": employee_id,
        "start_date": "2026-05-01",
        "end_date": "2026-05-01",
        "leave_type": "SAKIT",
        "reason": "Debug Test"
    },
    headers=get_auth_headers(token)
)
leave_data = leave_resp.json()
print(f"Leave created: {json.dumps(leave_data, indent=2)}")
leave_id = leave_data["id"]

# 4. Approve
print("Approving leave...")
approve_resp = client.patch(
    f"{base_url}/leave-requests/{leave_id}/",
    json={"status": "APPROVED"},
    headers=get_auth_headers(token)
)
print(f"Approve Response Status: {approve_resp.status_code}")
print(f"Approve Response Body: {json.dumps(approve_resp.json(), indent=2)}")

# 5. Check in DB explicitly via separate request
print("Verifying via GET...")
get_resp = client.get(
    f"{base_url}/leave-requests/{leave_id}/",
    headers=get_auth_headers(token)
)
print(f"GET Response: {json.dumps(get_resp.json(), indent=2)}")
