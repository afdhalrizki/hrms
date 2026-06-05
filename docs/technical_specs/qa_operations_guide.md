# QA Server Operations & Diagnostic Guide

This guide contains step-by-step instructions for running diagnostic commands, accessing shells, and executing Django database tasks on the **HariKerja HRMS** QA server.

> [!IMPORTANT]
> All commands listed in this guide **MUST** be run from the **project root directory** on the QA server (`/home/afdhalqa/hrms`).

---

## 🛠️ 1. Executing Django Commands on QA Server

Since the QA environment is deployed using a dedicated compose file (`deploy/qa/docker-compose.qa.yml`) and environment settings (`deploy/environments/.env.qa`), you must specify the configuration file using the `-f` flag for all `docker compose` execution commands.

### 1.1 Accessing the Django Shell (Interactive)
To launch an interactive Python shell inside the backend container:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py shell
```

### 1.2 Accessing the Django Shell (One-liner Command)
To execute a specific python snippet directly:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py shell -c "<python_code>"
```

### 1.3 Running Django Database Migrations
To run database migrations on the QA server:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py migrate
```

---

## 🔍 2. Diagnostic Snippets

### 2.1 Checking Superadmin Users
To print the list of all registered superadmin users (`is_superuser=True`) with their username and email:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print([f'Username: {u.username} | Email: {u.email}' for u in User.objects.filter(is_superuser=True)])"
```

### 2.2 Checking Active Tenants
To print the list of all schemas/tenants currently configured in the database:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py shell -c "from tenants.models import Tenant; print([t.schema_name for t in Tenant.objects.all()])"
```
