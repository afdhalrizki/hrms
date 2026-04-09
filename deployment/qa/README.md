# Quality Assurance (QA) & Testing Hub

Welcome to the HRMS Testing Hub. This directory is the central workstation for Software Testers (QA), Security Auditors, and DevOps engineers.

## Directory Structure

1.  **[performance/](file:///d:/hr/hrms/qa/performance)**: Load and Stress testing scripts.
    - Used to verify the **1 Million User** requirement (Phase 4).
    - Recommended Tools: `Locust`, `JMeter`.
2.  **[security/](file:///d:/hr/hrms/qa/security)**: Security audit logs, penetration test configs, and vulnerability scans.
    - Focus: Multi-tenant data isolation, SQL injection prevention, and API security.
    - Recommended Tools: `OWASP ZAP`, `Bandit`, `Snyk`.
3.  **[e2e/](file:///d:/hr/hrms/qa/e2e)**: End-to-End automated testing.
    - Focus: Testing real user flows across the browser (Next.js) and API.
    - Recommended Tools: `Playwright`, `Cypress`.
4.  **[manual/](file:///d:/hr/hrms/qa/manual)**: Checklists and test cases for manual QA.
    - Use for features that require human eyes (UI/UX, Face Recognition feel).
5.  **[reports/](file:///d:/hr/hrms/qa/reports)**: Store artifacts and results from test runs here.

## Getting Started for Testers
1. Ensure the environment is running in **Staging** mode.
2. Run automated sanity checks in `e2e/`.
3. Perform load tests in `performance/` before any major release.
