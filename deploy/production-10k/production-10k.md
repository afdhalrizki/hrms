# Production 10K - VPS Scaling Guide

This guide is for the **Production 10K** phase, designed to handle up to 10,000 active users on high-performance VPS infrastructure (non-AWS) while maintaining low latency and high stability.

## 🖥️ Recommended Specifications (Vertical Scaling)

To handle 10,000 users on a single/dual VPS setup, we move from "General Purpose" to "High Compute" tiers.

| Component | Minimum | Recommended (10K Users) |
| :--- | :--- | :--- |
| **vCPU** | 8 Cores | 16 - 24 Cores (Dedicated) |
| **RAM** | 16 GB | 32 GB - 64 GB |
| **Storage** | 100 GB SSD | 250 GB+ NVMe SSD |
| **Network** | 100 Mbps | 1 Gbps (Unmetered) |

### Provider Recommendations:
- **Biznet GIO**: NEO Dedicated vCPU or High-Memory tiers.
- **Hetzner**: CPX or Dedicated (CCX) series for best price/performance.
- **Contabo**: Cloud VPS XL for high RAM capacity.

---

## 🛠️ Performance Tuning (Optimizations)

In this phase, we move beyond default Docker settings.

### 1. PostgreSQL Optimization
The database is the bottleneck. In `.env.production_10k`, we must tune the memory:
- `shared_buffers`: Set to **25% of total RAM** (e.g., 8GB if RAM is 32GB).
- `work_mem`: Increase to **64MB** for complex HR reporting queries.
- `maintenance_work_mem`: **1GB** for fast schema migrations/indexing.

### 2. Gunicorn Worker Scaling
Increase workers in the `backend` container:
- Rule: `(2 x Cores) + 1`
- For 16 Cores: **33 Workers**.
- Use `gevent` or `uvicorn` workers for async I/O handling.

### 3. Nginx Static Serving
**Do NOT serve static files via Django (WhiteNoise).**
Nginx should serve `static/` and `media/` directly from the host volume for maximum speed.

### 4. Celery Background Processing
Background tasks (emails, notifications, payroll generation) are handled by the `celery` service.
- `CELERY_CPU_LIMIT`: Default **2.0** for production.
- `CELERY_MEM_LIMIT`: Default **2GB**.
- For high-volume notification bursts, increase the number of workers in the celery command.

### 5. SMTP Email Configuration
Ensure `.env.production_10k` contains production-ready SMTP credentials. Emails are dispatched asynchronously via Celery to ensure zero lag in user interactions.

---

## 🔒 Hardening & Security

1. **SSH Hardening**: Disable Password Authentication, use SSH Keys only.
2. **Fail2ban**: Automatically ban IPs with too many failed login attempts.
3. **UFW**: Tighten firewall to only allow 80, 443, and specific SSH IPs.
4. **Monitoring**: Install `Netdata` or `Prometheus/Grafana` to monitor RAM/CPU spikes.

---

## 🚀 Deployment Strategy

We use the same Docker logic but with a **Production-Specific Environment File**.

1. Prepare `deploy/environments/.env.production_10k`.
2. Use `deploy/production-10k/deploy_10k.sh` for automated deployment.
3. **ZDT (Zero Downtime)**: Use a blue-green approach or Nginx reload to avoid downtime during updates.

---

## 📂 Backup Strategy (Off-site)
For production, local backups are not enough.
1. Run `backup_10k.sh` daily.
2. Use `rclone` to sync the `backups/` folder to **S3** or **Google Drive** automatically.
