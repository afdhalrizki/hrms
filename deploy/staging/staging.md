# Staging Deployment Guide - AWS Phase 1 (Solo-Dev Simple)

This document is designed for a **Solo Developer** to deploy the HRMS application to AWS as simply and cheaply as possible. We use **AWS App Runner**, which handles everything (Servers, SSL, Scaling) automatically.

## Requirements
- An AWS Account.
- Domain managed in **Route 53** (Recommended for simplicity).
- Your code pushed to a Repository.

---

## Stage 1: The Database (Amazon RDS)

We will start here because the database needs to be ready before the application.

1.  **Search for "RDS"** in the AWS Console.
2.  Click **Create database**.
3.  Choose **Standard create** -> **PostgreSQL**.
4.  **Templates:** Choose **Free Tier** (or Dev/Test if Free Tier is unavailable).
5.  **Settings:**
    *   DB instance identifier: `hrms-staging-db`.
    *   Master username: `hrmsuser`.
    *   Master password: *(Generate a strong one and save it!)*.
6.  **Connectivity:**
    *   Public access: **No** (Very important for security).
    *   VPC Security Group: Create new, name it `rds-sg`.
7.  Click **Create database**.

---

## Stage 2: Bridging the Connection (VPC Connector)

Since RDS is private, we need a "bridge" for App Runner to talk to it.

1.  **Search for "App Runner"** in the AWS Console.
2.  In the left menu, click **VPC connectors** -> **Create VPC connector**.
3.  **Name:** `hrms-staging-connector`.
4.  **VPC:** Select the same VPC as your RDS (usually the Default VPC).
5.  **Subnets:** Select at least two subnets (e.g., `us-east-1a` and `us-east-1b`).
6.  **Security groups:** Select the **default** group or create one that allows outbound traffic.

> **CRITICAL STEP**: Go back to your **RDS Security Group** (`rds-sg`) and add an **Inbound Rule** allowing `PostgreSQL (5432)` from the Security Group you just used in the VPC Connector.

---

## Stage 3: The Application (AWS App Runner)

This is where the magic happens. We will deploy the **Backend** first.

1.  **Click "Create service"** in App Runner.
2.  **Source:** Choose **Container registry** -> **Amazon ECR**.
3.  **Container image URI:** Browse and select your `hrms-backend-staging` image.
4.  **Deployment settings:** Choose **Automatic** (it will redeploy every time you push a new image).
5.  **Configuration:**
    *   **Service name:** `hrms-backend-staging`.
    *   **Port:** `8000`.
    *   **Environment variables:** Add variables from `environments/.env.staging`.
        *   `DATABASE_URL`: `postgres://hrmsuser:password@endpoint:5432/postgres` (Get the endpoint from RDS console).
    *   **Networking:** Choose **Custom VPC** and select the `hrms-staging-connector` we created in Stage 2.
6.  Click **Create**. Wait ~5 minutes.

**Repeat** the same steps for the **Frontend** using:
*   **Service name:** `hrms-frontend-staging`.
*   **Port:** `3000`.
*   **Environment Variable:** `NEXT_PUBLIC_API_URL` -> Use the URL provided by the Backend App Runner service once it finishes deploying.

---

## Stage 4: Domain & SSL (Route 53)

1.  In your App Runner service dashboard, go to the **Custom domains** tab.
2.  Click **Link domain** and enter `staging.harikerja.web.id`.
3.  App Runner will provide **CNAME records**.
4.  Go to **Route 53** -> **Hosted Zones** -> Click your domain.
5.  Add the CNAME records provided. SSL (HTTPS) will be active automatically in ~30 minutes.

---

## Stage 5: Database Migrations (One-Time Setup)

Because we don't have a SSH server, the easiest way for a beginner to run migrations is:

1.  **Temporarily** set your RDS to **Public Access: Yes** in the RDS Console.
2.  Add your **Local IP** to the RDS Security Group rules.
3.  From your local machine terminal:
    ```bash
    export DATABASE_URL=postgres://hrmsuser:password@endpoint:5432/postgres
    python manage.py migrate_schemas --shared
    python manage.py create_tenant --schema_name=public --name="Staging" --domain-domain=staging.harikerja.web.id --is_primary=True
    ```
4.  **REVERT**: Set RDS back to **Public Access: No** immediately after finishing.

---

## Summary for Solo-Dev
- **Logs:** Go to App Runner -> **Logs** tab to see trial/error messages.
- **Costs:** Monitor the **AWS Billing Dashboard**. App Runner "Provisioned instances" have a small fee even when idle, but it's much cheaper than EKS.

The Staging environment is now LIVE. 🚀

