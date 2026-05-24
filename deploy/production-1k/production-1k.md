# Production 1K - Ideal Scaling Guide (1,000 Users)

This document outlines the ideal specifications for handling **1,000 active users** under full load, specifically optimized for peak concurrency during check-in/check-out hours and monthly payroll processing.

## 🖥️ Ideal Server Specifications

To ensure the application remains highly responsive, the following "Sweet Spot" configuration is recommended:

| Component | Ideal Specification | Rationale |
| :--- | :--- | :--- |
| **vCPU** | 4 Cores (Dedicated) | Sufficient for handling Gunicorn workers and Celery background tasks concurrently. |
| **RAM** | 8 GB | Optimal for PostgreSQL buffer caching and Next.js server-side rendering. |
| **Storage** | 80 GB NVMe SSD | High IOPS is mandatory to prevent I/O wait during high-frequency database writes. |
| **Network** | 1 Gbps Shared (Public) | High-speed pipe from Biznet GIO ensures zero bottleneck (10 Gbps is available internally for private VPC connectivity). |

### Recommended Providers:
- **Biznet GIO**: **NEO Lite Pro MM.8.4** (4 vCPU AMD EPYC™ 3.1 GHz, 8GB RAM, 80GB NVMe). 
  *   *Best choice for performance/cost balance in Indonesia.*
  *   *Dedicated IOPS and high-clock CPU ensure zero lag during morning check-in peaks.*
- **Hetzner**: **CCX21** (4 Dedicated Cores, 8GB RAM, 80GB NVMe).
  *   *Excellent alternative if local latency is not the primary concern.*

---

## 🛠️ Performance Tuning

The following optimizations are applied to maximize the efficiency of the 4 Core / 8 GB setup:

### 1. Backend (Django/Gunicorn)
- **Workers**: 5 Workers (Formula: `(1 x 4 Cores) + 1`). This is conservative for RAM footprint. Since Gunicorn uses `gevent` asynchronous workers, 5 workers can easily handle thousands of concurrent requests without the high memory consumption of 9 workers.
- **Timeout**: 120 seconds (To prevent timeouts during heavy payroll exports).

### 2. Database (PostgreSQL)
Configuration tuned in `.env.production_1k`:
- `POSTGRES_SHARED_BUFFERS`: **1 GB** (Optimized for the `DB_MEM_LIMIT=2.5G` container limit to prevent host/container OOM).
- `POSTGRES_MAX_CONNECTIONS`: **100** (Reduced since PgBouncer handles up to 500 client connections and pools them into 50 DB connections).
- `POSTGRES_WORK_MEM`: **32 MB**.

### 3. Background Processing (Celery)
- **Concurrency**: 4 workers.
- Tasks: Email dispatch, payroll PDF generation, and push notifications.

### 4. Reverse Proxy (Nginx)
- **Gzip Compression**: Level 6 (Optimal balance between CPU and bandwidth).
- **Client Max Body Size**: 50MB (Supports high-resolution attendance uploads).

---

## 📂 Deployment Structure
The `deploy/production-1k/` directory contains:
1. `docker-compose.1k.yml`: Pre-configured container orchestration.
2. `nginx.conf`: Production-tuned reverse proxy settings.
3. `deploy_1k_production.sh`: Automated zero-downtime deployment script with health checks.
4. `backup_1k.sh`: Hourly/Daily database backup automation.

---

## 🔒 Security & Maintenance
1. **Backups**: Run `backup_1k.sh` via Cron daily at 02:00 AM.
2. **SSL**: Always use Wildcard SSL via Let's Encrypt for multi-tenant isolation.
3. **OS**: Ubuntu 22.04 LTS / 24.04 LTS recommended.
