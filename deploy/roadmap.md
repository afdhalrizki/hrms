# HariKerja HRMS - Infrastructure & Deployment Roadmap

This document outlines the strategic progression plan for the HariKerja HRMS platform infrastructure, transitioning from initial Quality Assurance (QA) to small-scale launch, mid-scale growth, and high-traffic enterprise scaling.

---

## 📍 Phase 1: Quality Assurance (Current)

*   **Target**: Internal verification, manual UAT, stakeholder demonstration, and API integrations.
*   **Infrastructure**: Single-instance VPS (Biznet GIO / IDCloudHost / Hostinger).
*   **Specifications**:
    *   **Current (Active)**: 8 Cores, 8 GB RAM (Biznet NEO Lite MM 8.8) — *Temporary Over-provisioned*.
    *   **Target Ideal (Optimized)**: 2 Cores, 4 GB RAM + 4 GB Swap File (Biznet NEO Lite MS 4.2) — *Cost-optimized for manual UAT, saving 50% to 75% in hosting costs*.
*   **Key Features**:
    *   Local storage for media/uploads (Docker volume).
    *   Single PostgreSQL database instance with multi-tenant schemas.
    *   Docker-integrated Nginx proxy with wildcard Let's Encrypt SSL.
    *   Automated daily backup with retention limit of 7 days.
*   **Goal**: 100% functional stability and validation of core business logic.

---

## 🚀 Phase 1.5: Production 1K (Sweet Spot)

*   **Target**: Initial client launch for up to **1,000 active users**.
*   **Infrastructure**: High-performance Single-instance VPS (Biznet GIO / Hetzner).
*   **Specifications**: 4 Cores, 8 GB RAM, 80 GB NVMe SSD (Biznet NEO Lite Pro MM.8.4 or Hetzner CCX21).
*   **Key Features**:
    *   **Connection Pooling**: PgBouncer integration to scale database connections efficiently (reduces active DB connections to 50, supporting up to 500 client connections).
    *   **Backend Concurrency**: Gunicorn optimized with 5 asynchronous gevent workers.
    *   **Media Offloading**: Direct integration with S3-compatible object storage (Biznet GIO NEO Object Storage) using standard S3 protocol, saving NVMe SSD space and VPS network bandwidth.
*   **Goal**: Lean and highly stable initial production launch with zero bottlenecks.

---

## ⚡ Phase 2: Production 10K (Scaling VPS Cluster)

*   **Target**: Mid-scale growth up to **10,000 active users**.
*   **Infrastructure**: High-performance VPS cluster (Dedicated compute nodes or vertically scaled VPS).
*   **Specifications**: 16 Cores, 32 GB – 64 GB RAM, high-speed NVMe Storage.
*   **Key Features**:
    *   Hardened Nginx front-facing configuration.
    *   Tuned PostgreSQL (Shared Buffers optimized to host RAM limits).
    *   PgBouncer clustering for high throughput.
    *   Automated daily off-site backups to redundant Object Storage buckets.
*   **Goal**: Maximum performance, high throughput, and cost-efficiency during the growth phase.

---

## ☁️ Phase 3: Enterprise AWS (Elastic Scale)

*   **Target**: Enterprise clients with **100,000+ active users** and High-Availability requirements.
*   **Infrastructure**: Amazon Web Services (AWS Cloud).
*   **Architecture**:
    *   **Compute**: AWS EKS (Elastic Kubernetes Service) for container orchestration and auto-scaling.
    *   **Database**: Amazon RDS for PostgreSQL (Multi-AZ with read-replicas).
    *   **Caching**: Amazon ElastiCache for Redis (Clustered).
    *   **Storage**: Amazon S3 with CloudFront CDN for global, low-latency media delivery.
*   **Goal**: Infinite horizontal scalability, geo-redundancy, and 99.9% Uptime SLA.

---

### Why the 1K and 10K VPS Phases?

Transitioning directly to managed cloud architectures (like AWS) for 1,000 to 10,000 users is often cost-prohibitive and overly complex for growing startups. A vertically scaled/optimized VPS model provides:
1.  **Superior Price-to-Performance**: Modern NVMe VPS often outperforms entry-tier cloud RDS in raw CPU performance and I/O latency.
2.  **Predictable Billing**: Fixed monthly costs prevent unexpected variable usage surprises.
3.  **Simplified Maintenance**: Single-point infrastructure allows a small, agile engineering team to focus entirely on application features rather than cluster orchestration.
