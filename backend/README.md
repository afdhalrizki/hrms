# HRMS SaaS Backend (Django)

This is the core API for the HRMS SaaS application, built with Django, Django REST Framework, and `django-tenants` for multi-tenant isolation.

## Features
- **Multi-Tenancy**: Isolated database schemas for each company.
- **Biometric API**: Face recognition reference and liveness verification tracking.
- **Indonesian Payroll Engine**: TER 2024 compliance, BPJS, and PDF Payslip generation.
- **Attendance & Geofencing**: GPS-validated clock-in/out with shift-based status tracking.
- **API Documentation**: Interactive Swagger UI via `drf-spectacular`.

## Prerequisites
- **Python**: 3.10 or higher
- **PostgreSQL**: 14+ (Required for schema-based multi-tenancy)
- **Redis**: For caching and connection pooling (optional for local dev but recommended)

## 1. Installation

### Setup Virtual Environment
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Environment Configuration
The backend uses a PostgreSQL database. Ensure your local database is running. If using the root `docker-compose.yml`, run:
```bash
docker-compose up -d db redis
```

Update `backend/config/settings.py` or use environment variables for `DATABASES`, `REDIS_URL`, and `TENANT_DOMAIN_SUFFIX`.

- **`TENANT_DOMAIN_SUFFIX`**: Defaults to `localhost`. Change this to your base domain in staging/production (e.g., `myhrms.com`).

## 2. Database Initialization (Multi-Tenant)

### Run Migrations
```bash
# Migrate shared public tables (Tenants, Domains, Users)
python manage.py migrate_schemas --shared

# Migrate tenant-specific tables
python manage.py migrate_schemas --tenant
```

### Setup Initial Tenants
Run the following script or use the Django shell to create the public and first sample tenant:
```python
# python manage.py shell
from tenants.models import Tenant, Domain

# 1. Create Public Tenant (Main Domain)
tenant = Tenant(schema_name='public', name='HRMS SaaS Public')
tenant.save()
Domain.objects.create(domain='localhost', tenant=tenant, is_primary=True)

# 2. Create Sample Company
tenant = Tenant(schema_name='company1', name='First Company')
tenant.save()
from django.conf import settings
domain_name = f'company1.{settings.TENANT_DOMAIN_SUFFIX}'
Domain.objects.create(domain=domain_name, tenant=tenant, is_primary=True)
```

## 3. Running the Server

### Start Django Dev Server
```bash
python manage.py runserver
```

The server will be available at:
- Public Dashboard: `http://localhost:8000`
- Tenant Dashboard: `http://company1.localhost:8000`
- Admin Interface: `http://localhost:8000/admin/`

## 4. API Documentation
Once the server is running, access the interactive documentation:
- **Swagger UI**: `http://localhost:8000/api/schema/swagger-ui/`
- **Redoc**: `http://localhost:8000/api/schema/redoc/`

## 5. Testing
The project uses `pytest` for backend testing:
```bash
pytest
```

---
**Note**: To access `company1.localhost` in your local browser, you must add an entry to your `hosts` file:
`127.0.0.1 company1.localhost`
