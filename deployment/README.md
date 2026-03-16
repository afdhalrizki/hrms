# harikerja HRMS - Deployment Guide

This directory contains the necessary documentation to deploy the HRMS platform across different environments, scaling from a single laptop to a global enterprise cluster.

## Environments

1. **[Local Development](./local.md)**
   Quick start guide using `docker-compose` for rapid iteration and testing.

2. **[Staging / Early Production (VPS)](./staging.md)**
   Deployment strategy for a single Virtual Private Server (VPS) supporting up to 5,000 users, utilizing a managed PostgreSQL database and PgBouncer.

3. **[Enterprise Production (Kubernetes)](./production.md)**
   Roadmap and architectural requirements for deploying to AWS/GCP to support 1 Million+ users with high availability and auto-scaling.

## Core Services

Regardless of the environment, the platform requires the following core services to operate correctly:
- **Django API Backend** (Python)
- **Next.js Frontend** (React)
- **PostgreSQL Database** (with schemas enabled)
- **PgBouncer** (Connection Pooler)
- **Redis** (Caching & Sessions)
