# Domain & DNS Setup Guide

This guide explains how to connect your purchased domain (e.g., from IDCloudHost, Niagahoster, GoDaddy) to your HRMS server and how to configure it for a multi-tenant (SaaS) architecture.

## 1. Prerequisites
- A purchased domain name.
- The **Public IP Address** of your VPS (Biznet GIO, IDCloudHost, etc.).
  - *Example IP: 103.123.45.67*

## 2. DNS Configuration (The "Connection")

Go to your Domain Registrar's dashboard, find **DNS Management**, and add the following records. These are critical for the multi-tenant system to work.

| Type | Host / Name | Value (Your VPS IP) | Purpose |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `103.123.45.67` | Root domain (`harikerja.web.id`) |
| **A** | `www` | `103.123.45.67` | WWW subdomain (`www.harikerja.web.id`) |
| **A** | `*` | `103.123.45.67` | **Wildcard**: Handles all client subdomains (`client1.harikerja.web.id`, etc.) |

### Why the Wildcard (`*`) Record?
In this HRMS, every company gets their own subdomain. Instead of manually adding a DNS record for every new client, the `*` (asterisk) record tells the internet: *"Send ANY subdomain of harikerja.web.id to this specific VPS IP."*

---

## 3. SSL Configuration (HTTPS)

For a multi-tenant app, a standard SSL certificate is not enough. You need a **Wildcard SSL Certificate**.

### DNS Challenge for SSL
When you run the Certbot command for a wildcard certificate:
```bash
sudo certbot certonly --manual --preferred-challenges=dns -d harikerja.web.id -d *.harikerja.web.id
```
Certbot will ask you to add a **TXT Record** to your DNS settings as a "proof of ownership".

| Type | Host / Name | Value |
| :--- | :--- | :--- |
| **TXT** | `_acme-challenge` | *A random string provided by Certbot* |

**Steps:**
1. Run the Certbot command.
2. Copy the random string provided.
3. Go to your DNS Panel and add the TXT record.
4. **Wait 1-2 minutes** for the DNS to propagate.
5. Go back to the terminal and press `Enter`.

---

## 4. Verification

After setting up DNS, you can verify if it's working using the `ping` command from your local computer:

```bash
# Test root domain
ping harikerja.web.id

# Test a random subdomain
ping anyclient.harikerja.web.id
```
If both commands return your VPS IP Address, your DNS is correctly configured!
