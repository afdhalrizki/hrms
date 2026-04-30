# Staging Environment - Performance & Load Testing Guide

The **Staging Environment** is the final performance gateway before production. Its primary purpose is to perform **Load Testing**, **Stress Testing**, and **Maximum User Capacity Verification** (simulating 1,000 to 10,000+ concurrent users).

> [!NOTE]
> **Current Status:** This environment is currently **omitted (ditiadakan)** in the initial phase but remains planned as the final hurdle for system scalability.

## 🖥️ Recommended Server Specifications (Parity Mode)

To ensure valid test results, the Staging environment should ideally match or exceed the Production-1K specifications.

| Component | Target Specification | Rationale |
| :--- | :--- | :--- |
| **vCPU** | 8 Cores (Dedicated) | Required to simulate high-concurrency Gunicorn workers during load tests. |
| **RAM** | 16 GB | Necessary for PostgreSQL performance under stress and monitoring tool overhead. |
| **Storage** | 100 GB NVMe SSD | Ensures storage I/O is not a bottleneck during high-frequency log writes. |
| **Network** | 10 Gbps (Unmetered) | **Mandatory** to simulate real-world traffic spikes without network throttling. |

### Deployment Options:
1.  **Biznet GIO (Recommended for Parity):** Use **NEO Lite Pro MM.16.8** (8 vCPU, 16GB RAM) to maintain parity with the Indonesia-based production environment.
2.  **AWS (For Global Scalability Testing):** Use **AWS App Runner** + **RDS PostgreSQL** (as detailed in Phase 1) for testing auto-scaling behavior.

---

## 🚀 Staging-Specific Testing Goals

Unlike QA which focuses on *features*, Staging focuses on *limits*:

### 1. Load Testing (1,000 - 10,000 Users)
*   **Tools:** Locust or JMeter.
*   **Goal:** Verify that the system maintains a response time under 2 seconds for 95% of requests during peak traffic simulations.

### 2. Stress Testing (Breaking Point)
*   **Goal:** Identify the exact number of concurrent users that cause the system to crash or significantly degrade.
*   **Action:** Tune Gunicorn workers and PostgreSQL connections based on these results.

### 3. Database Bottleneck Analysis
*   **Goal:** Identify slow queries that only appear under high concurrency.
*   **Tools:** PostgreSQL `pg_stat_statements` and AWS Performance Insights (if using RDS).

### 4. Background Task Saturation
*   **Goal:** Test how many concurrent "Payroll PDF Generations" can be handled by Celery workers before the queue becomes unresponsive.

---

## 🛠️ Deployment Summary (AWS / Biznet)

### Option A: AWS App Runner (Simplified Scaling)
*   **Pros:** Automatic scaling, built-in SSL, easy to tear down after testing.
*   **Cons:** Higher cost for data egress and RDS instance.

### Option B: Biznet GIO (Production Parity)
*   **Pros:** Identical network latency and CPU architecture to Production-1K. Low cost.
*   **Cons:** Requires manual server setup and Nginx tuning (follow [production-1k/nginx.conf](file:///home/afdhal/data/hr/hrms/deploy/production-1k/nginx.conf)).

---

## 🔒 Post-Testing Protocol
Since Staging is for performance testing, it should not be kept running 24/7 if not in use:
1.  **Snapshot:** Take a disk snapshot of the tuned environment.
2.  **Tear Down:** Stop or terminate instances to save costs.
3.  **Report:** Document the "Maximum Safe Capacity" in the Architecture Decision Records (ADR).

The Staging environment is the "Proving Ground" where the system's 10K-readiness is officially certified. 🚀
