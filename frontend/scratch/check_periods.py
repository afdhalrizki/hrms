import requests

def check_backend():
    base_url = "http://localhost:8000/api"
    
    # Login to get token
    login_url = f"{base_url}/auth/login/"
    payload = {
        "email": "admin@company1.com",
        "password": "password123"
    }
    
    try:
        resp = requests.post(login_url, json=payload)
        resp.raise_for_status()
        token = resp.json()['access']
        print("Login successful")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Check periods
        resp = requests.get(f"{base_url}/payroll-periods", headers=headers)
        resp.raise_for_status()
        periods = resp.json()
        print(f"Periods found: {len(periods)}")
        for p in periods:
            print(f"  - ID: {p['id']}, Closed: {p['is_closed']}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_backend()
