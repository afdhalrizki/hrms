# Enterprise Production Deployment (Kubernetes)

This guide outlines the architectural requirements and steps for deploying harikerja HRMS to support 1 Million+ users in a highly available, auto-scaling production environment using Kubernetes (EKS/GKE).

## Architecture Overview

At enterprise scale, the monolith docker-compose setup is replaced by distributed Cloud Native services:

1. **Load Balancing & Ingress**: 
   - AWS ALB / GCP HTTPS Load Balancer.
   - Nginx Ingress Controller routing by subdomains (`*.company.com`).
2. **Compute Layer**:
   - Managed Kubernetes (Amazon EKS or Google GKE).
   - Horizontal Pod Autoscaler (HPA) for Django Backend and Next.js Frontend.
3. **Database Layer**:
   - Managed PostgreSQL (Amazon RDS or Google Cloud SQL) - Multi-AZ for High Availability.
   - PgBouncer deployed as a sidecar or dedicated Deployment to handle 10,000+ max connections.
4. **Caching & Asynchronous Processing**:
   - Managed Redis (Amazon ElastiCache).
   - Celery workers (for heavy Payroll PDF generation and bulk attendance calculations).

## Step 1: Managed Database Provisioning
1. Provision a PostgreSQL 15 instance via RDS/Cloud SQL.
2. Ensure you select "Multi-AZ" for failover.
3. Create the Database (`hrms`) and Master User.

## Step 2: Kubernetes Cluster Setup
1. Create an EKS/GKE cluster with autoscaling node groups (e.g., `m7g.large` instances).
2. Install necessary cluster add-ons: Ingress Controller, Cert-Manager, Metrics Server.

## Step 3: Deployment Manifests
You will need to convert the `docker-compose.yml` into Kubernetes manifests (`Deployment`, `Service`, `HPA`, `Ingress`).

*A typical Django Deployment with PgBouncer sidecar looks like this:*
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hrms-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hrms-backend
  template:
    metadata:
      labels:
        app: hrms-backend
    spec:
      containers:
      - name: django
        image: your-registry.com/hrms-backend:latest
        envFrom:
        - secretRef:
            name: hrms-secrets
      - name: pgbouncer
        image: brainsam/pgbouncer:latest
        # PgBouncer connects to RDS, Django connects to localhost:6432
```

## Step 4: Auto-Scaling Configuration
Implement an HPA to handle the "08:00 AM Attendance Rush":
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hrms-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hrms-backend
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Step 5: CI/CD Pipeline
Production deployments MUST be automated using GitHub Actions or GitLab CI.
1. Run Unit Tests (`pytest`, `vitest`).
2. Run E2E Tests (`playwright`).
3. Build Docker Images and push to ECR/GCR.
4. `kubectl apply` the new manifests or use ArgoCD/Flux for GitOps.
