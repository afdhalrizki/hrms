# Harikerja Automation Strategy (MJS & PS1)

This document explains the synchronization strategy between JavaScript (`.mjs`) and PowerShell (`.ps1`) orchestration scripts within the Harikerja project.

## 1. Orchestration Philosophy
This project utilizes a dual-script system to ensure full compatibility for all developers:
- **`*.mjs` (JavaScript/Node.js)**: Serves as the **Source of Truth**. These scripts are designed to run identically on Linux, macOS, and Windows (via Node.js).
- **`*.ps1` (PowerShell)**: The native version for the Windows platform (also compatible with PowerShell Core on Linux). This version is synchronized to maintain feature parity with the `.mjs` version.

## 2. Why Synchronization is Necessary?
Prior to the major update (April 2026), the `.ps1` scripts lagged significantly in terms of functionality. Synchronization was performed to achieve:
- **Feature Parity**: Ensuring parameters such as `--integrated`, `--coverage`, and `--skip-docker` are available on both platforms.
- **Robustness**: Implementing *Health Checks* (server readiness verification) and *Port Cleanup* logic that was previously only available in the `.mjs` versions.
- **Identical Expectations**: A Windows developer running `./up.ps1` will receive the same results, logging performance, and safety checks as a Linux developer running `node up.mjs`.

## 3. Key Synchronized Features
All `.ps1` scripts have been updated with:
- **Smart Dependency Checking**: Using hashing (`.venv_requirements.hash`) to avoid redundant installations.
- **Automatic Health Checks**: Waiting for backend servers to be fully reachable (HTTP 200/404) before executing tests.
- **Automatic Cleanup**: Clearing hanging processes on port 8000 (Backend) and 3000 (Frontend) before starting new services.
- **Centralized Reporting**: Logs are stored in the `logs/` directory with standardized naming conventions.

## 4. Maintenance Guidelines
To maintain consistency in the future, please follow these rules:
1. **Double Update**: If logic changes are made to an `.mjs` file, ensure the equivalent logic is updated in the corresponding `.ps1` file.
2. **Naming Convention**: Maintain identical filenames (e.g., `run_dev.mjs` paired with `run_dev.ps1`).
3. **Library Compatibility**: When introducing a new npm library in `.mjs`, consider its equivalent in PowerShell (usually native OS commands or .NET libraries).

---
*Last Updated: April 14, 2026*
