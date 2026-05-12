import requests

def test_login(email, password, tenant):
    url = "http://127.0.0.1:8000/api/auth/login/"
    headers = {"X-Tenant": tenant}
    data = {"email": email, "password": password}
    
    try:
        resp = requests.post(url, json=data, headers=headers)
        print(f"Login {email} on {tenant}: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    test_login("admin@company1.com", "password123", "company1")
    test_login("superadmin@harikerja.com", "password123", "public")
    test_login("employee1@worker_0.com", "password123", "worker_0")
