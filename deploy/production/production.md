# Production Deployment Guide - AWS Phase 1 (Solo-Dev Simple)

This document provides a simplified, step-by-step guide for a **Solo Developer** to launch the HRMS platform to Production using **AWS App Runner**.

## Prerequisites
- Domain: `harikerja.com` (Managed in Route 53).
- AWS Account with Billing alerts enabled.
- All code tested and verified in Staging.

---

## Stage 1: The Production Database (RDS)

1.  **Search for "RDS"** in the AWS Console.
2.  Click **Create database** -> **Standard create** -> **PostgreSQL**.
3.  **Templates:** Choose **Production** (This enables standard safety features).
4.  **Settings:**
    *   DB instance identifier: `hrms-production-db`.
    *   Master username: `hrmsadmin`.
    *   Master password: *(Store this securely in AWS Secrets Manager later!)*.
5.  **Instance configuration:**
    *   Start with `db.t4g.small` (You can upgrade this later without losing data).
6.  **Connectivity:**
    *   Public access: **No**.
    *   VPC Security Group: Create new, name it `rds-prod-sg`.
7.  **Maintenance:** Enable automated backups (7 days retention).

---

## Stage 2: Networking Bridge (VPC Connector)

1.  **Search for "App Runner"** -> **VPC connectors** -> **Create VPC connector**.
2.  **Name:** `hrms-prod-connector`.
3.  **VPC:** Select the same VPC as your RDS instance.
4.  **Security groups:** Select a group that allows outbound traffic.

> **CRITICAL**: Go to **RDS Security Group** (`rds-prod-sg`) and add an **Inbound Rule** allowing `PostgreSQL (5432)` from the Security Group used in your VPC Connector.

---

## Stage 3: Deploying the Application (App Runner)

### 1. Deploy Frontend
1.  **Click "Create service"** in App Runner.
2.  **Source:** Choose **Container registry** -> **Amazon ECR**.
3.  **Image URI:** Select `hrms-frontend-prod`.
4.  **Service name:** `hrms-frontend-prod`.
5.  **Environment variables:** Add variables from `environments/.env.production`.
6.  Click **Create**.

### 2. Deploy Backend
Follow the same steps as Frontend but:
1.  **Service name:** `hrms-backend-prod`.
2.  **Port:** `8000`.
3.  **Networking:** Choose **Custom VPC** and select the `hrms-prod-connector`.
4.  **Environment variables:**
    *   `DATABASE_URL`: `postgres://hrmsadmin:password@endpoint:5432/postgres`.
    *   `SECRET_KEY`: Use a unique, long random string.

---

## Stage 4: Domain & SSL Setup

1.  In App Runner (Frontend service) -> **Custom domains** tab -> **Link domain**.
2.  Enter `harikerja.com`.
3.  Copy the **CNAME records** to your **Route 53 Hosted Zone**.
4.  Wait for the status to turn **Active** (usually 30-60 mins).

---

## Stage 5: Production Database Migration

The safest way for a solo dev to run migrations is via a temporary "Public" window:

1.  In RDS Console, temporarily set the DB to **Public access: Yes**.
2.  In `rds-prod-sg`, allow your **Local IP**.
3.  Run from your local terminal:
    ```bash
    export DATABASE_URL=postgres://hrmsadmin:password@prod-endpoint:5432/postgres
    python manage.py migrate_schemas --shared
    python manage.py create_tenant --schema_name=public --name="harikerja" --domain-domain=harikerja.com --is_primary=True
    ```
4.  **IMPORTANT**: Set RDS back to **Public access: No** immediately after success.

---

## Stage 6: Security Hardening

1.  **AWS WAF**: 
    *   Create a Web ACL and associate it with your App Runner service.
    *   Enable **Amazon Managed Rules** (Core rule set, SQL Injection).
    *   Enable **IP Rate Limiting** to prevent brute-force attacks on login.
2.  **AWS Secrets Manager**:
    *   Store `DATABASE_URL` and `SECRET_KEY` in Secrets Manager.
    *   Update your environment variables to reference the secret ARN (requires custom integration) or keep them in App Runner Environment Variables with restricted IAM access.

---

## Stage 7: Disaster Recovery (DR)

1.  **Automated Backups**: Ensure RDS has a 7-30 day retention period.
2.  **Snapshot Replication**: Enable replication of RDS snapshots to a secondary region (e.g., from `us-east-1` to `us-west-2`).
3.  **Point-in-Time Recovery**: Test restoring the DB once every 6 months to a temporary instance.

---

## Scaling for the Future
- **Horizontal Scaling:** App Runner will automatically add more instances if the CPU usage is high.
- **Microservices:** If you need more complex routing later, you can migrate from App Runner to **Amazon EKS** as documented in the [AWS High Availability Architecture](../docs/aws_high_availability_architecture.md).

Production is now LIVE. 🚀
