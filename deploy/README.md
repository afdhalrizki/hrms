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

### 3. [Production 1K (Single-Instance VPS)](./production-1k/production-1k.md)
*   **Path**: `deploy/production-1k/`
*   **Purpose**: Small-scale initial client launch (up to 1k users) on standard VPS.
*   **Automation**: Includes [deploy_1k_production.sh](./production-1k/deploy_1k_production.sh).

### 4. [Production 10K (Scaling VPS cluster)](./production-10k/production-10k.md)
*   **Path**: `deploy/production-10k/`
*   **Purpose**: Mid-scale launch (up to 10k users) on high-spec VPS nodes.
*   **Automation**: Includes [deploy_10k_production.sh](./production-10k/deploy_10k_production.sh).

### 5. [Staging 1K (Active Staging)](./staging-1k/staging-1k.md)
*   **Path**: `deploy/staging-1k/`
*   **Purpose**: Active staging environment for 1k users integration and scaling tests.
*   **Automation**: Includes [safe_deploy_staging-1k.sh](./staging-1k/safe_deploy_staging-1k.sh).

### 6. [Staging Global (Paused)](./staging/staging.md)
*   **Path**: `deploy/staging/`
*   **Status**: On hold until Phase 3 scaling tests.

### 7. [Enterprise AWS (High-Availability Production)](./production/production.md)
*   **Path**: `deploy/production/`
*   **Purpose**: Multi-node enterprise AWS cluster targeting 100k+ to 1M users.

---

## 🗺️ Strategy & Roadmap
See the full infrastructure journey in **[Roadmap.md](./roadmap.md)**.

## 🛠️ Deployment Utilities

| Tool | Location | Usage | Purpose |
| :--- | :--- | :--- | :--- |
| **`up.mjs`** | `/` (Root) | `node up.mjs [env]` | Cross-platform Node.js helper to orchestrate containers. |
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
