# 🖥️ Client Access Guide: Admin Portals (Dual Network Environments)

This document is a practical step-by-step guide for **Administrative Staff, Customer Support, DevOps, and Testers** to configure their local machines to access the Main Admin Portal (SaaS Next.js) and Django Admin on the HariKerja HRMS platform.

Administrative access is strictly protected and can only be opened using one of the **two network conditions** currently active on the QA/Staging server.

---

## 🧭 Access Method Selection Matrix

Before starting, ask your server administrator (DevOps) which network condition is currently active on the server:

| Active Server Condition | Client Access Method | Required Application | Required File / Account |
| :--- | :--- | :--- | :--- |
| **Condition 1: VPN-Only** (Default) | Traditional VPN Connection | OpenVPN Connect or WireGuard | VPN Profile file (`.ovpn` or `.conf`) |
| **Condition 2: Zero Trust** (Cloudflare) | **Method A:** SSO Email PIN<br>**Method B:** Cloudflare WARP | Standard Web Browser<br>Cloudflare WARP App | Active corporate email (`@harikerja.com` or whitelisted domain) |

---

## 🔒 Section 1: Condition 1 Guide - Access via Traditional VPN (VPN-Only)

Use this method if the QA server is deployed using the default mode without Cloudflare. A VPN connection must be active for Nginx to authorize your local IP.

### A. Client Configuration on Ubuntu / Debian Linux
You can connect using either the Graphical User Interface (GUI) or the Command Line Interface (CLI).

#### Option 1: Using GNOME Graphical Interface (GUI Settings) - *Recommended*
1.  Open your terminal (`Ctrl + Alt + T`) and install the OpenVPN GNOME integration packages:
    ```bash
    sudo apt update
    sudo apt install network-manager-openvpn-gnome -y
    sudo systemctl restart NetworkManager
    ```
2.  Open **Settings** on your Ubuntu machine.
3.  Select **Network** from the left panel.
4.  In the **VPN** section, click the **`+` (Add)** button.
5.  Select **Import from file...** at the bottom of the modal dialog.
6.  Choose the `.ovpn` profile file provided by your DevOps administrator.
7.  Click **Add** to save.
8.  To connect, click the network status menu in the top-right corner of your screen, select your new VPN profile, and click **Connect**.

#### Option 2: Using Terminal (CLI)
*   **Using OpenVPN:**
    ```bash
    sudo apt update && sudo apt install openvpn -y
    sudo openvpn --config /path/to/your_profile.ovpn
    ```
    *(Keep this terminal open while working. Press `Ctrl + C` to disconnect).*
*   **Using WireGuard:**
    ```bash
    sudo apt update && sudo apt install wireguard -y
    sudo cp /path/to/your_profile.conf /etc/wireguard/wg0.conf
    sudo wg-quick up wg0
    ```
    *(Run `sudo wg-quick down wg0` in the terminal to disconnect).*

---

### B. Client Configuration on Windows
1.  Download and install the official [OpenVPN Connect for Windows](https://openvpn.net/client-connect-vpn-for-windows/).
2.  Launch the **OpenVPN Connect** app.
3.  Go to the **File** tab, then drag-and-drop your `.ovpn` profile file into the app window.
4.  Toggle the switch to connect (the switch turns green upon a successful connection).

---

### C. Client Configuration on macOS
1.  Download and install the official [OpenVPN Connect for macOS](https://openvpn.net/client-connect-vpn-for-mac-os/).
2.  Launch the **OpenVPN Connect** app.
3.  Drag-and-drop your `.ovpn` profile file into the **File** tab inside the app window.
4.  Slide the toggle switch to the right. If macOS prompts you for permission to add network configurations, enter your Mac system password and click **Allow**.

---

## ☁️ Section 2: Condition 2 Guide - Access via Cloudflare Zero Trust (No Traditional VPN)

Use this method if the server is deployed with the `--with-cloudflare` / `-c` flag. You do not need any `.ovpn` or `.conf` files.

### Method A: Quick Browser Access (SSO PIN - App-less)
Best suited for occasional access or guest machines as it requires no software installations.

1.  Open your browser and navigate directly to the secret Admin Portal address:
    `https://harikerja.web.id/login/portal-admin-secure-39f28j`
2.  The **Cloudflare Access** verification screen will appear automatically.
3.  Enter your whitelisted corporate email address (e.g., `staff@harikerja.com`) and click **Send Code**.
4.  Open your corporate email inbox and copy the **6-digit one-time PIN code** sent by Cloudflare.
5.  Enter the PIN code into the Cloudflare browser page.
6.  Once verified, you will be redirected to the Next.js Admin Portal login screen.

---

### Method B: Automated Connection via Cloudflare WARP (Modern VPN - Recommended)
Best suited for daily staff to bypass repetitive PIN browser challenges.

1.  Download and install the official **Cloudflare WARP** client from [1.1.1.1](https://1.1.1.1/) for your OS (Windows, macOS, or Linux).
2.  Open the **Cloudflare WARP** app on your computer.
3.  Go to **Preferences / Settings** (gear icon) -> select the **Account** tab -> click **Login to Cloudflare Zero Trust**.
4.  Enter your company's Zero Trust team domain (provided by DevOps, e.g., `harikerja-team`) and click **Ok**.
5.  A browser window will open automatically asking for authentication. Enter your corporate email address and verify with the PIN code.
6.  Return to the WARP client app and toggle the main switch to **Connected**.
7.  You can now access the admin portal `https://harikerja.web.id/login/portal-admin-secure-39f28j` directly in your browser without seeing PIN challenges anymore!

---

## 🛠️ Troubleshooting Guide

### 1. "403 Forbidden" Error Appears
*   **Cause (Condition 1):** Your traditional VPN connection is disconnected, or your local public IP address is not registered in the Nginx whitelisting block.
*   **Solution (Condition 1):** Verify that your OpenVPN client shows a green/connected state. If the issue persists, contact DevOps to check if your current public IP needs to be whitelisted.
*   **Cause (Condition 2):** You are attempting to access the custom admin URL directly without running the Cloudflare WARP client or without bypassing Cloudflare Access restrictions.
*   **Solution (Condition 2):** Ensure that your Cloudflare WARP client is running and shows a **Connected** status.

### 2. "502 Bad Gateway" Error Appears
*   **Cause:** The Nginx gateway is up, but the backend (Django) or frontend (Next.js) container has stopped or experienced a process crash in the server.
*   **Solution:** Contact the DevOps server administrator to verify container statuses using `docker ps` or restart the services via `./deploy/qa/deploy_qa.sh`.

### 3. Cloudflare PIN OTP Email Not Received
*   **Cause:** The email has been filtered into your Spam/Junk folder, or your email address is not registered in the whitelisted *Access Policy* on the Cloudflare Zero Trust dashboard.
*   **Solution:** Check your Spam/Junk folder first. If it's missing, contact DevOps to ensure that your email address is properly added to the *HRMS QA Admin Portal* application policy rules in Cloudflare.

---
*This document is a part of the official client access documentation for the HariKerja HRMS platform.*
