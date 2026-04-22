import requests

url = "http://127.0.0.1:8000/api/internal/registrations/440/approve/"
response = requests.post(url)
print(response.status_code)
print(response.text)
