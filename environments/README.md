# Environment Configurations Strategy

This directory contains template configuration files for different stages of the HRMS project.

## Environments Overview

1.  **Development (`.env.development.example`)**: 
    - Used for local coding on developer machines.
    - `DEBUG=True` to show detailed errors.
    - Points to local Docker PostgreSQL and Redis.
2.  **Staging (`.env.staging.example`)**: 
    - Used for Quality Assurance (QA) and User Acceptance Testing (UAT).
    - Mimics Production but with test data.
3.  **Production (`.env.production.example`)**: 
    - The "Live" environment for real customers.
    - `DEBUG=False` for security.

## New Management Tools

### 1. Utility Scripts (`scripts/`)
-   **`switch_env.py`**: A helper script to quickly switch between environments.
    -   *Usage*: `python scripts/switch_env.py [development|staging|production]`
    -   *Action*: Copies the chosen template to the root `.env` file.
-   **`validate_env.py`**: Verifies that your current root `.env` has all the keys required by the templates.

### 2. Secrets Storage (`secrets/`)
This folder is intended for sensitive files that cannot be stored as text in `.env`, such as:
- SSL Certificates (`.crt`, `.key`)
- SSH Keys
- Service Account JSON keys

## Security Critical Rule
> [!CAUTION]
> **NEVER** commit actual `.env` files or files inside `secrets/` to Git. 
> A local `.gitignore` has been added to this folder to prevent accidental leaks.

## How to use:
1.  Select your target environment.
2.  Run the switch script: `python scripts/switch_env.py staging`
3.  Fill in the sensitive values in the newly created root `.env`.
