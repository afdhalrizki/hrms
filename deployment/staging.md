# Staging Deployment (AWS - Stress Test)

This guide outlines the steps to deploy the harikerja HRMS to the **Staging environment** on **AWS**. This environment is identical to production to support stress testing for up to 1 million users.

## Environment Details
- **Domain:** `harikerja.web.id`
- **Hosting:** AWS (EKS / ECS / EC2 Cluster).
- **Purpose:** Stress testing, performance benchmarking (1M users), and final verification before production.

## Architecture Highlights
- **Identical to Production:** Uses the same infrastructure-as-code (Terraform/CloudFormation) as the production environment.
- **Database:** Amazon RDS (PostgreSQL) with high-availability and read-replicas.
- **Scaling:** Auto-scaling groups enabled to handle massive traffic spikes.
- **CDN:** CloudFront for global asset delivery.

## Step 1: Infrastructure Provisioning
1. Use the provided Terraform scripts in `infrastructure/aws/` to spin up the staging cluster.
2. Ensure the RDS instance is sized correctly for stress testing.

## Step 2: Configuration
1. Use `environments/.env.staging`.
2. Critical Variables:
   - `TENANT_DOMAIN_SUFFIX=harikerja.web.id`
   - `STRESS_TEST_MODE=true`

## Step 3: Deployment
Deploy the Docker images to ECR and update the EKS cluster/ECS service.

```bash
make staging
```

## Step 4: SSL (AWS Certificate Manager)
Ensure `harikerja.web.id` and `*.harikerja.web.id` are covered by ACM and attached to the Application Load Balancer (ALB).
