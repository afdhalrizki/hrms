# Security Self-Assessment Guide

This document provides a step-by-step guide for developers and system engineers to perform security self-assessments across all components of the HRMS application: **Backend**, **Frontend**, **Mobile**, and **Infrastructure/Server**. 

Periodic security scanning is crucial to detect vulnerabilities early (DevSecOps) before deploying code to production environments.

---

## Security Tooling Matrix Summary

| Component | Test Type | Tools | Recommended Frequency |
| :--- | :--- | :--- | :--- |
| **Backend** (Django/Python) | SAST (Static Analysis) | `bandit` | Every Pull Request / CI/CD |
| | Dependency (SCA) | `pip-audit` / `safety` | Every Pull Request / Weekly |
| | Framework Config | `django check --deploy` | Before Release / CI/CD |
| **Frontend** (JS/TS/React) | Dependency (SCA) | `npm audit` | Every Pull Request / CI/CD |
| | SAST (Static Analysis) | `eslint-plugin-security` | Every Commit / PR |
| **Mobile** (React Native/etc) | Comprehensive SAST & DAST | `MobSF` (Mobile Security Framework) | Before Major Releases |
| **Infrastructure / Server** | Container Security | `trivy` | CI/CD Build / Weekly |
| | Linux OS Audit | `lynis` | Monthly |
| | Port & TLS Audit | `nmap` & `testssl.sh` | Before Go-Live / Monthly |
| **All Stacks** | Secrets Leaks Detection | `trufflehog` | CI/CD Pipeline |

---

## 1. Backend Security Scanning (Python/Django)

The backend uses Django. The primary focus is on auditing custom code, external dependencies, and framework security settings.

### A. Static Application Security Testing (SAST) using `bandit`
`bandit` analyzes Python's AST (Abstract Syntax Tree) to find common security issues such as the use of `eval()`, weak hash functions, or hardcoded passwords.

*   **Installation:**
    ```bash
    pip install bandit
    ```
*   **Execution:**
    Run this command inside the `backend` directory:
    ```bash
    bandit -r . -f txt -o bandit_report.txt
    ```
    *The `-r .` argument recursively scans all subdirectories. The report will be saved to `bandit_report.txt`.*

### B. Software Composition Analysis (SCA) using `pip-audit`
`pip-audit` scans packages listed in `requirements.txt` against the PyPA (Python Packaging Advisory) and OSV (Open Source Vulnerabilities) databases.

*   **Installation:**
    ```bash
    pip install pip-audit
    ```
*   **Execution:**
    ```bash
    pip-audit -r requirements.txt --format columns
    ```

### C. Django Configuration Audit (`check --deploy`)
Django has an integrated checking tool to verify `settings.py` parameters before deploying to production.

*   **Execution:**
    Set your `DJANGO_SETTINGS_MODULE` environment variable to production first, then run:
    ```bash
    python manage.py check --deploy
    ```
    > [!IMPORTANT]
    > Ensure that `DEBUG = False` is active during this check to obtain accurate production audit results.

---

## 2. Frontend Security Scanning (Node.js/JavaScript/TypeScript)

Modern frontends are highly dependent on third-party packages (npm ecosystem) and require secure coding guidelines to prevent client-side vulnerabilities like XSS.

### A. Dependency Auditing (SCA) using `npm audit`
`npm audit` is built into npm to analyze the package dependency tree in `package-lock.json` against known vulnerabilities.

*   **Execution:**
    Navigate to your `frontend` directory and run:
    ```bash
    npm audit
    ```
*   **Automatic Remediation:**
    To automatically upgrade vulnerable dependencies to non-breaking safe versions:
    ```bash
    npm audit fix
    ```

### B. Static Analysis using ESLint (`eslint-plugin-security`)
Integrating security rules into your linter helps prevent risky patterns (such as unescaped raw HTML output or dynamic execution).

*   **Installation:**
    ```bash
    npm install --save-dev eslint-plugin-security
    ```
*   **Configuration in `.eslintrc.json`:**
    ```json
    {
      "extends": [
        "eslint:recommended",
        "plugin:security/recommended"
      ],
      "plugins": [
        "security"
      ]
    }
    ```
*   **Execution:**
    ```bash
    npm run lint
    ```

---

## 3. Mobile Security Scanning (Android/iOS)

Mobile applications are susceptible to reverse engineering (decompilation), insecure local storage, and credential leakage.

### A. Mobile Security Framework (MobSF)
`MobSF` is an automated, all-in-one mobile security testing framework capable of performing static analysis (SAST) and dynamic analysis (DAST) on binary packages (`.apk` or `.ipa`).

*   **Running via Docker:**
    The easiest way to run MobSF locally is using a Docker container:
    ```bash
    docker run -it --rm -p 8000:8000 opensecurity/mobsf:latest
    ```
*   **How to Use:**
    1. Open your web browser and go to `http://localhost:8000`.
    2. Upload your application binary (`.apk`, `.aab`, or `.ipa`).
    3. MobSF will generate a comprehensive security report detailing binary security protections, hardcoded secrets, dangerous permissions, and OWASP Mobile Top 10 vulnerabilities.

---

## 4. Infrastructure & Server Security Scanning

Securing operating systems, web server setups (like Nginx), and container engines (Docker) constitutes your last line of defense.

### A. Container and Docker Config Scanning using `trivy`
`trivy` is a fast and comprehensive security scanner that detects vulnerabilities in container images, filesystems, and configuration files (such as `docker-compose.yml`).

*   **Installation (Ubuntu/Debian):**
    ```bash
    sudo apt-get install wget apt-transport-https gnupg lsb-release
    wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
    echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
    sudo apt-get update
    sudo apt-get install trivy
    ```
*   **Execution:**
    *   **Scanning Dockerfile / Docker Compose files:**
        ```bash
        trivy config .
        ```
    *   **Scanning an active Docker Image:**
        ```bash
        trivy image your-backend-image:latest
        ```

### B. Linux OS Security Audit using `lynis`
`lynis` is an open-source security auditing tool for Unix-like operating systems. It performs a detailed security scan of SSH config, kernel hardening, firewalls, permissions, and log systems.

*   **Installation:**
    ```bash
    sudo apt-get install lynis
    ```
*   **Execution:**
    ```bash
    sudo lynis audit system
    ```
    > [!TIP]
    > `lynis` outputs a general security *Hardening Index* along with a highly detailed list of *Suggestions* and *Warnings* to patch found issues.

### C. SSL/TLS Audit using `testssl.sh`
`testssl.sh` is a free command-line tool which checks a server's service on any port for support of TLS/SSL ciphers, protocols, cryptographic vulnerabilities, and certificate details.

*   **Running via Docker:**
    ```bash
    docker run --rm -ti drwetter/testssl.sh https://your-domain.com
    ```

---

## 5. Secrets and Credentials Detection

Leaked API keys, database credentials, or private SSH keys inside Git history can be extremely critical.

### A. Secret Detection using `trufflehog`
`trufflehog` searches through git commit history and directories for high-entropy strings and signatures matching known secrets (e.g., AWS keys, database connection strings, Stripe keys).

*   **Execution via Docker:**
    *   **Scan a GitHub repository's commit history:**
        ```bash
        docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest github --repo https://github.com/username/repo.git
        ```
    *   **Scan a local workspace directory:**
        ```bash
        docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest filesystem /pwd
        ```

---

## Remediation Workflow (Post-Scan Actions)

1.  **Vulnerability Classification**: Categorize security issues into *Critical*, *High*, *Medium*, and *Low*.
2.  **Immediate Remediation**: Issues classified as *Critical* and *High* (e.g., outdated dependency with an active remote code execution exploit, or databases exposed to the public internet) must be patched immediately.
3.  **CI/CD Automation**: Gradually integrate tools like `bandit`, `pip-audit`, and `npm audit` into your CI/CD pipelines to run automatically on every Pull Request.
