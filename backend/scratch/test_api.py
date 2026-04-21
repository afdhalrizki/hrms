import httpx
import sys

BASE_URL = "http://localhost:8000/api"

def test_stats():
    # 1. Login
    login_url = f"{BASE_URL}/auth/login/"
    payload = {
        "email": "admin@company1.com",
        "password": "harikerja2026!"
    }
    
    with httpx.Client() as client:
        # Login
        r = client.post(login_url, json=payload)
        if r.status_code != 200:
            print(f"Login Failed: {r.status_code} {r.text}")
            return
            
        tokens = r.json()
        access_token = tokens['access']
        
        # 2. Get Stats
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Tenant": "company1"
        }
        
        stats_url = f"{BASE_URL}/core/dashboard-stats/"
        r = client.get(stats_url, headers=headers)
        print(f"Stats Code: {r.status_code}")
        print(f"Stats Body: {r.text}")

if __name__ == "__main__":
    test_stats()
