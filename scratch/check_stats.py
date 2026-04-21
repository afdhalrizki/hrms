import requests
import json

url = "http://127.0.0.1:8000/api/auth/login/"
payload = {"email": "admin@company1.com", "password": "password123"}
r = requests.post(url, json=payload, headers={"X-Tenant": "company1"})
token = r.json()['access']

url = "http://127.0.0.1:8000/api/core/dashboard-stats/"
r = requests.get(url, headers={"Authorization": f"Bearer {token}", "X-Tenant": "company1"})
print(json.dumps(r.json(), indent=2))
