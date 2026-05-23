# Cloudflare Zero Trust & Tunnel Integration Guide

This guide explains how to secure the HariKerja HRMS Admin Portal using **Cloudflare Zero Trust** and **Cloudflare Tunnel (Argo Tunnel)**. This solution completely hides your QA server from the public internet and restricts access to authenticated team members only—without requiring a traditional VPN server or `.ovpn` profile files.

---

## 1. How It Works
Instead of opening firewall ports (like 80 or 443) on your QA server to the public internet, we install a lightweight Cloudflare daemon (`cloudflared`) on the server. This daemon establishes secure, outbound-only connections to Cloudflare's nearest edge network. 

```
[Operational Staff] ──> [Cloudflare Edge (WARP / Access Auth)] ──> [Cloudflare Tunnel] ──> [QA Server (Nginx / Django)]
```

* **No Open Ports:** Your QA server's firewall can block all inbound traffic on ports 80 and 443. Only outbound connections to Cloudflare are needed.
* **SSO Authentication:** Anyone trying to access `/portal-admin-secure-auth-39f28j/` must first authenticate using their corporate email.

---

## 2. Step 1: Create a Cloudflare Tunnel in the Dashboard
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Zero Trust** in the sidebar.
2. Navigate to **Networks** -> **Tunnels** and click **Create a Tunnel**.
3. Choose **Cloudflare Tunnel (connector)** and click **Next**.
4. Name your tunnel (e.g., `harikerja-qa-tunnel`) and click **Save tunnel**.
5. Keep this page open; you will see instructions containing your **Tunnel Token** (a long alphanumeric string starting with `ey...`).

---

## 3. Step 2: Install the Cloudflare Connector on the QA Server

Since your QA environment runs on Docker (managed by `deploy_qa.sh`), the most elegant way to run `cloudflared` is as an isolated container in your `docker-compose.qa.yml` file.

### A. Add the Cloudflare Service to `deploy/qa/docker-compose.qa.yml`
Open `deploy/qa/docker-compose.qa.yml` and add the `tunnel` service under `services`:

```yaml
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared_tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - nginx
```

### B. Add the Token to `deploy/environments/.env.qa`
Open `deploy/environments/.env.qa` and append your tunnel token:
```env
CLOUDFLARE_TUNNEL_TOKEN=your_actual_tunnel_token_here
```

### C. Connect Nginx in Cloudflare Dashboard
In the Cloudflare Zero Trust Dashboard where you created the tunnel:
1. Click **Next** to proceed to the **Route Traffic** tab.
2. Under **Public Hostname**, configure:
   * **Subdomain:** `harikerja.web.id` (or your staging domain).
   * **Service Type:** `HTTP`
   * **URL:** `nginx:80` (or `http://localhost:80` if using host network).
3. Click **Save hostname**. Now, Cloudflare routes traffic securely to your QA Nginx container!

---

## 4. Step 3: Create Access Policy for Admin Portal
Now we block public access to the secret admin path and enforce authentication.

1. In the Cloudflare Zero Trust sidebar, go to **Access** -> **Applications** and click **Add an Application**.
2. Select **Self-hosted**.
3. Configure **Application Configuration**:
   * **Application Name:** `HRMS QA Admin Portal`
   * **Session Duration:** `24 hours`
   * **Domain:** `harikerja.web.id`
   * **Path:** `portal-admin-secure-auth-39f28j/` (Your customized secret `ADMIN_URL`).
4. Click **Next** to configure the **Policy**:
   * **Policy Name:** `Allow Authorized Staff`
   * **Action:** `Allow`
5. In **Configure rules** (Who is allowed?):
   * **Selector:** `Emails`
   * **Value:** Add authorized emails (e.g., `superadmin@harikerja.com`, `support@harikerja.com`).
   * *(Alternatively, select `Emails ending in` and enter `@yourdomain.com` for your entire team).*
6. Click **Next** and click **Add application**.

---

## 5. Step 4: Accessing the Admin Portal (Operational Staff Guide)

### Scenario A: accessing from a web browser
1. Open your browser and navigate to the permanent secret URL:
   `https://harikerja.web.id/portal-admin-secure-auth-39f28j/`
2. Since access is restricted, Cloudflare will display a login page asking for your email address.
3. Enter your registered corporate email and click **Send Code**.
4. Check your email inbox for a **6-digit Cloudflare PIN**.
5. Enter the PIN on the Cloudflare page.
6. Once verified, you will be redirected to the Django Admin Portal login page!
7. Enter your standard administrator credentials and complete the Django MFA setup.

### Scenario B: accessing using Cloudflare WARP client (Recommended)
1. Download and install the [Cloudflare WARP Client](https://1.1.1.1/).
2. Open the app, go to Settings -> **Account** -> **Login to Cloudflare Zero Trust**.
3. Enter your team domain (provided by DevOps) and log in with your email.
4. Toggle the switch to **Connected**.
5. You can now access `https://harikerja.web.id/portal-admin-secure-auth-39f28j/` directly without receiving browser PIN challenges every time!
