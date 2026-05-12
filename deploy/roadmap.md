# HRMS Infrastructure Roadmap

This document outlines the strategic growth plan for the HariKerja HRMS platform infrastructure, transitioning from initial QA to high-traffic production.

## 📍 Phase 1: Quality Assurance (Current)
- **Target**: Internal testing, UAT, and Automated E2E.
- **Infrastructure**: Single VPS (Biznet/IDCloudHost).
- **Specs**: 
    - **Minimum**: 4 vCPU, 8GB RAM (Manual UAT only).
    - **Recommended**: 8 vCPU, 16GB RAM (Required for Playwright E2E Automation).
- **Goal**: Functional stability and 100% test pass rate.

## 🚀 Phase 2: Production 10K (Coming Soon)
- **Target**: Initial market launch up to **10,000 active users**.
- **Infrastructure**: High-performance Single/Dual VPS.
- **Specs**: 16 vCPU, 32GB - 64GB RAM, NVMe Storage.
- **Key Features**:
    - Hardened Nginx configuration.
    - Optimized PostgreSQL (Tuned Shared Buffers).
    - Connection Pooling (PgBouncer) scaling.
    - Automated daily off-site backups.
- **Goal**: Performance and cost-efficiency during the growth phase.

## ☁️ Phase 3: Enterprise AWS (Scale)
- **Target**: **100,000+ users** with high availability.
- **Infrastructure**: AWS Cloud (EKS, RDS, ElastiCache, S3).
- **Architecture**: Micro-services ready, Multi-AZ deployment.
- **Goal**: Infinite scalability and 99.9% Uptime SLA.

---

### Why the 10K Phase?
Transitioning directly to AWS for 1,000 - 10,000 users is often cost-prohibitive for startups. A vertically scaled VPS provides:
1. **Performance**: Modern NVMe VPS often outperforms RDS entry-tiers in latency.
2. **Predictable Cost**: Fixed monthly billing vs. variable cloud usage.
3. **Simplicity**: Single-point management for solo-dev/small teams.
