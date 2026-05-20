# HariKerja HRMS - Infrastructure & Deployment Hub

This directory is the **Single Point of Truth** for all things related to infrastructure, environment configurations, and deployment procedures for the HariKerja HRMS platform.

## 📂 Structure Overview

The infrastructure is organized by target environment:

### 1. [Local Development](./local/local.md)
*   **Path**: `deploy/local/`
*   **Purpose**: Running the HRMS on a developer machine using Docker.
*   **Entry Points**: Root-level `up.ps1` or `up.mjs`.

### 2. [QA (Quality Assurance)](./qa/qa.md)
*   **Path**: `deploy/qa/`
*   **Purpose**: Functional testing on `harikerja.web.id`.

### 3. [Production 10K (Scaling VPS)](./production-10k/production-10k.md)
*   **Path**: `deploy/production-10k/`
*   **Purpose**: Initial market launch (up to 10k users) on high-spec VPS.
*   **Automation**: Includes [deploy_10k_production.sh](./production-10k/deploy_10k_production.sh).

### 4. [Staging (Paused)](./staging/staging.md)
*   **Path**: `deploy/staging/`
*   **Status**: On hold until Phase 3.

### 5. [Enterprise AWS](./production/production.md)
*   **Path**: `deploy/production/`
*   **Purpose**: High-availability enterprise cluster for 100k+ users.

---

## 🗺️ Strategy & Roadmap
See the full infrastructure journey in **[Roadmap.md](./roadmap.md)**.

## 🛠️ Deployment Utilities

| Tool | Location | Usage | Purpose |
| :--- | :--- | :--- | :--- |
| **`up.ps1`** | `/` (Root) | `.\up.ps1 [env]` | Windows helper to start the platform. |
| **`Makefile`** | `/` (Root) | `make [env]` | Standard orchestration for Linux servers. |
| **DNS Guide** | `deploy/common/` | **[Read Guide](./common/dns_setup.md)** | **Domain & Wildcard DNS Setup.** |
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
