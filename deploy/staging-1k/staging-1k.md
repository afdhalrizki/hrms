# Staging 1K - Performance Validation Guide (1,000 Users)

The **Staging 1K** environment is a performance twin of the Production-1K environment. Its purpose is to validate that the **8.4 (4 Core / 8 GB RAM)** specification can effectively handle the full load of 1,000 users before the actual production launch.

## 🖥️ Target Server Specifications (Production Mirror)

To ensure load test results are valid, this environment **must** use the exact same specifications as the target production server:

| Component | Specification | Rationale |
| :--- | :--- | :--- |
| **vCPU** | 4 Cores (Dedicated) | Validates Gunicorn worker efficiency (9 workers). |
| **RAM** | 8 GB | Tests PostgreSQL buffer and Next.js memory limits under load. |
| **Storage** | 80 GB NVMe SSD | Verifies DB write performance during high-concurrency attendance peaks. |
| **Network** | 10 Gbps (Unmetered) | Eliminates network bottlenecks during 1,000 user simulation. |

### Recommended Provider:
- **Biznet GIO**: **NEO Lite Pro MM.8.4** (8 GB RAM, 4 vCPU).
  *   *Note: Using the exact same plan as Production ensures zero surprises during launch.*

---

## 🚀 Load Testing Scenarios for 1K Readiness

Before certifying this environment as "Production Ready", the following tests must be performed:

### 1. The "Morning Rush" Simulation (Concurrency Test)
*   **Target:** 200 - 300 concurrent users performing "Check-in" within a 5-minute window.
*   **Acceptance Criteria:** 95th percentile response time < 1.5 seconds.

### 2. Payroll Export Stress Test
*   **Target:** 10 users generating heavy PDF payroll reports simultaneously.
*   **Acceptance Criteria:** System remains responsive for other users; no "502 Bad Gateway" or OOM (Out of Memory) errors.

### 3. Multi-tenant Data Integrity
*   **Target:** Run parallel data seeding for 10 different tenants.
*   **Acceptance Criteria:** Database CPU usage remains under 80% and I/O wait remains low.

---

## 🛠️ Configuration & Deployment

### 1. Nginx Tuning
Use the optimized configuration from [production-1k/nginx.conf](file:///home/afdhal/data/hr/hrms/deploy/production-1k/nginx.conf). This is critical to test the Gzip level 6 performance.

### 2. Monitoring Tools
During the test, monitor the following via CLI:
*   `htop`: Check per-core CPU usage.
*   `docker stats`: Monitor RAM consumption of the `backend` and `db` containers.
*   `iotop`: Verify NVMe disk activity.

### 3. Cleanup
Once the 1K Load Test is complete and certified, the Staging-1K environment can be terminated to save costs, or kept as a "Pre-Prod" gateway for future updates.

This environment provides the final "Peace of Mind" that the 8.4 spec is truly sufficient for the 1,000 user milestone. 🚀
