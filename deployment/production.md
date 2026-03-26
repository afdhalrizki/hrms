# Production Deployment (Enterprise AWS)

This guide outlines the steps to deploy the harikerja HRMS to the **Production environment** on **AWS**.

## Environment Details
- **Domain:** `harikerja.com`
- **Hosting:** AWS (EKS / RDS / Elasticache).
- **Purpose:** Official enterprise production environment.

## Architecture Overview

At enterprise scale, the platform uses distributed Cloud Native services:

1. **Load Balancing & Ingress**: 
   - AWS ALB with Nginx Ingress Controller.
   - Wildcard SSL via AWS Certificate Manager (ACM).
2. **Compute Layer**:
   - Managed Kubernetes (Amazon EKS).
   - Horizontal Pod Autoscaler (HPA) for Backend and Frontend.
3. **Database Layer**:
   - Managed PostgreSQL (Amazon RDS) - Multi-AZ for High Availability.
   - PgBouncer sidecars for connection pooling.
4. **Caching**:
   - Managed Redis (Amazon ElastiCache).

## Step 1: Managed Database Provisioning
1. Provision a PostgreSQL 15 instance via RDS.
2. Ensure you select "Multi-AZ" for failover.
3. Create the Database (`hrms`) and Master User.

## Step 2: Environment Configuration
The platform uses `environments/.env.production`.
- **Domain:** `TENANT_DOMAIN_SUFFIX=harikerja.com`
- **Security:** Use AWS Secrets Manager for all sensitive keys.

## Step 3: Deployment Manifests
Use the provided Helm charts or Kubernetes manifests specifically for the production namespace.

```bash
make prod
```

## Step 4: Auto-Scaling
Implement HPA to handle peak attendance hours:
```yaml
minReplicas: 10
maxReplicas: 100
targetCPUUtilizationPercentage: 70
```

## Step 5: CI/CD Pipeline
All production deployments must go through the automated pipeline after passing:
1. Logic Coverage (100%).
2. E2E Playwright tests.
3. Security scanning.
