# harikerja HRMS - Deployment Guide

This directory contains the necessary documentation to deploy the HRMS platform across different environments, scaling from a single laptop to a global enterprise cluster.

## Environments

1. **[Local Development](./local.md)**
   Quick start guide using `docker-compose` for rapid iteration and testing on your local machine.

2. **[QA (IDCloudHost VPS)](./qa.md)**
   Deployment strategy for Quality Assurance on `harilibur.web.id`, ideal for functional testing.

3. **[Staging (AWS - Stress Test)](./staging.md)**
   Identical to production infrastructure on `harikerja.web.id`, designed for 1M user stress testing.

4. **[Production (Enterprise AWS)](./production.md)**
   Scalable, high-availability architecture on `harikerja.com` (EKS/RDS) for enterprise workloads.

## Deployment Tools

The platform provides helper scripts to manage different environments easily:

| Tool | Usage | OS | Purpose |
| :--- | :--- | :--- | :--- |
| **`up.ps1`** | `.\up.ps1 [dev\|staging\|prod]` | Windows | Orchestrates containers with correct `.env`. |
| **`Makefile`** | `make [dev\|staging\|prod]` | Linux/Mac | Standard orchestration for VPS/Servers. |
| **Scripts** | `python environments/scripts/switch_env.py` | Universal | Manual `.env` toggling for IDEs. |

## Core Services

Regardless of the environment, the platform requires the following core services to operate correctly:
- **Django API Backend** (Python)
- **Next.js Frontend** (React)
- **PostgreSQL Database** (with schemas enabled)
- **PgBouncer** (Connection Pooler)
- **Redis** (Caching & Sessions)
