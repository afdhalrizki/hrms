# harikerja HRMS - Infrastructure & Deployment Hub

This directory is the **Single Point of Truth** for all things related to infrastructure, environment configurations, and deployment procedures for the harikerja HRMS platform.

## 📂 Structure Overview

The infrastructure is organized by target environment:

### 1. [Local Development](./local/local.md)
*   **Path**: `deploy/local/`
*   **Purpose**: Running the HRMS on a developer machine using Docker.
*   **Entry Points**: Root-level `up.ps1` or `up.mjs`.

### 2. [QA (Quality Assurance)](./qa/qa.md)
*   **Path**: `deploy/qa/`
*   **Purpose**: Functional testing on `qa.harikerja.web.id` (IDCloudHost/Biznet).
*   **Automation**: Includes [deploy_qa.sh](./qa/deploy_qa.sh) for automated server provisioning.

### 3. [Staging](./staging/staging.md)
*   **Path**: `deploy/staging/`
*   **Purpose**: Stress testing (1M users) on AWS infrastructure identical to production.

### 4. [Production](./production/production.md)
*   **Path**: `deploy/production/`
*   **Purpose**: High-availability enterprise cluster on AWS (EKS/RDS/S3).

## 🛠️ Deployment Utilities

| Tool | Location | Usage | Purpose |
| :--- | :--- | :--- | :--- |
| **`up.ps1`** | `/` (Root) | `.\up.ps1 [env]` | Windows helper to start the platform. |
| **`Makefile`** | `/` (Root) | `make [env]` | Standard orchestration for Linux servers. |
| **`deploy_qa.sh`** | `deploy/qa/` | `sudo ./deploy_qa.sh` | Automated Ubuntu VPS setup for QA. |
| **`.env` files** | `deploy/environments/` | N/A | Centralized secrets and configurations. |

## 🧩 Core Infrastructure Components

Regardless of the environment, the platform operates on:
- **Django API Backend** (Python) + **PgBouncer** (Pooling)
- **Next.js Frontend** (React)
- **PostgreSQL 15** (Multi-tenant schemas)
- **Redis 7** (Caching & Pub/Sub)

---

> [!TIP]
> **Adding a new environment?** Create a new subfolder under `deploy/` and add a corresponding `.env` file in `deploy/environments/`.
