# Production 1K - Ideal Scaling Guide (1,000 Users)

This document outlines the ideal specifications for handling **1,000 active users** under full load, specifically optimized for peak concurrency during check-in/check-out hours and monthly payroll processing.

## 🖥️ Ideal Server Specifications

To ensure the application remains highly responsive, the following "Sweet Spot" configuration is recommended:

| Component | Ideal Specification | Rationale |
| :--- | :--- | :--- |
| **vCPU** | 4 Cores (Dedicated) | Sufficient for handling Gunicorn workers and Celery background tasks concurrently. |
| **RAM** | 8 GB | Optimal for PostgreSQL buffer caching and Next.js server-side rendering. |
| **Storage** | 80 GB NVMe SSD | High IOPS is mandatory to prevent I/O wait during high-frequency database writes. |
| **Network** | 1 Gbps (Unmetered) | Ensures fast delivery of static assets and media files (attendance photos, etc.). |

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
- **Workers**: 9 Workers (Formula: `(2 x 4 Cores) + 1`).
- **Timeout**: 120 seconds (To prevent timeouts during heavy payroll exports).

### 2. Database (PostgreSQL)
Configuration tuned in `.env.production_1k`:
- `POSTGRES_SHARED_BUFFERS`: **2 GB** (25% of total RAM).
- `POSTGRES_MAX_CONNECTIONS`: **200**.
- `POSTGRES_WORK_MEM`: **32 MB**.

### 3. Background Processing (Celery)
- **Concurrency**: 4 workers.
- Tasks: Email dispatch, payroll PDF generation, and push notifications.

### 4. Reverse Proxy (Nginx)
- **Gzip Compression**: Level 5 (Balance between CPU usage and transfer speed).
- **Client Max Body Size**: 50MB (Supports high-resolution attendance uploads).

---

## 📂 Deployment Structure
The `deploy/production-1k/` directory contains:
1. `docker-compose.1k.yml`: Pre-configured container orchestration.
2. `nginx.conf`: Production-tuned reverse proxy settings.
3. `safe_deploy_1k.sh`: Automated zero-downtime deployment script with health checks.
4. `backup_1k.sh`: Hourly/Daily database backup automation.

---

## 🔒 Security & Maintenance
1. **Backups**: Run `backup_1k.sh` via Cron daily at 02:00 AM.
2. **SSL**: Always use Wildcard SSL via Let's Encrypt for multi-tenant isolation.
3. **OS**: Ubuntu 22.04 LTS / 24.04 LTS recommended.
