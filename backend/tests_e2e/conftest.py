import pytest
import httpx
import os

@pytest.fixture
def base_url():
    return "http://127.0.0.1:8000/api"

@pytest.fixture
def tenant1_domain():
    return "company1.localhost"

@pytest.fixture
def tenant2_domain():
    return "company2.localhost"

@pytest.fixture
def client():
    return httpx.Client(timeout=10.0)

@pytest.fixture
async def async_client():
    async with httpx.AsyncClient(timeout=10.0) as client:
        yield client

def get_auth_headers(domain, token=None):
    headers = {
        "X-Tenant-Domain": domain,
        "Host": f"{domain}:8000", # Compatibility with django-tenants
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers
