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
    # Increased timeout for E2E tests to avoid transient Docker startup/network delays
    return httpx.Client(timeout=60.0)

@pytest.fixture
async def async_client():
    async with httpx.AsyncClient(timeout=60.0) as client:
        yield client

def get_auth_headers(domain, token=None):
    headers = {
        "X-Tenant-Domain": domain,
        "Host": "localhost:8000", # Always use a valid host to satisfy ALLOWED_HOSTS
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers
