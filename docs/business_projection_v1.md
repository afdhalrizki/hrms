# Business Projection & Financial Analysis (v1.0)

This document provides a conservative financial projection for the **harikerja HRMS** platform based on the "Hybrid Freemium + Tiered Pricing" model.

---

## 1. Operating Expenses (OpEx) Estimate

To maintain a high-availability SaaS platform, we estimate the following monthly burn rate for the initial launch phase (0–1,000 active tenants).

| Expense Category | Description | Monthly Estimate (IDR) |
| :--- | :--- | :--- |
| **Cloud Infrastructure** | AWS/GCP (EC2, RDS, S3, Redis, PGBouncer) | Rp 3,000,000 |
| **Communication APIs** | SendGrid (Email) & WhatsApp Gateway | Rp 1,500,000 |
| **Payment Gateway** | Midtrans transaction fees (Estimated) | Rp 500,000 |
| **Maintenance & Security**| Security patches, backups, and monitoring | Rp 1,000,000 |
| **TOTAL OPEX** | | **Rp 6,000,000** |

---

## 2. Revenue Scenarios

Based on our pricing tiers: **Free (Rp 0)**, **Essential (Rp 250k)**, **Professional (Rp 750k)**, **Premium (Rp 1.5M)**, and **Enterprise (Custom)**.

### Scenario A: Initial Launch (Month 1-3)
*Target: Early adopters and close network.*
*   10 Tenants (Essential) @ 250k = Rp 2,500,000
*   5 Tenants (Professional) @ 750k = Rp 3,750,000
*   **Gross Revenue**: **Rp 6,250,000**
*   **Net Profit**: **Rp 250,000** (Break-Even reached)

### Scenario B: Market Growth (Month 6-12)
*Target: SME clusters and referrals.*
*   40 Tenants (Essential) @ 250k = Rp 10,000,000
*   25 Tenants (Professional) @ 750k = Rp 18,750,000
*   5 Tenants (Premium) @ 1.5M = Rp 7,500,000
*   1 Tenant (Enterprise) @ Negotiated = Rp 10,000,000
*   **Gross Revenue**: **Rp 46,250,000**
*   **Opex (Scaled)**: Rp 10,000,000
*   **Net Monthly Profit**: **Rp 36,250,000**

---

## 3. Key Financial Metrics

### 3.1 Break-Even Point (BEP)
To cover the initial **Rp 6,000,000** OpEx:
*   You only need **8 Clients** on the **Professional Plan**.
*   OR **24 Clients** on the **Essential Plan**.

### 3.2 Lifetime Value (LTV) vs CAC
*   **LTV**: Considering HRMS is a "sticky" product, we expect an average retention of **24 months**.
    *   Professional LTV = Rp 750k x 24 = **Rp 18,000,000**.
*   **CAC (Customer Acquisition Cost)**: If you spend Rp 2,000,000 on ads to get 1 Professional client, you have a **9x ROI**.

---

## 4. Strategic Recommendations for Profitability

1.  **Focus on Professional Tier**: This is the "Cash Cow". The inclusion of Payroll makes it essential for any Indonesian business with >20 employees.
2.  **Freemium as a Pipeline**: Use the **FREE Plan** (up to 10 employees) to lower acquisition costs. These users will eventually upgrade as they grow.
3.  **Enterprise Customization**: One Enterprise deal can often pay for your entire infrastructure for a year. Prioritize landing at least one large client (2,000+ employees).
4.  **Annual Prepayment**: Incentivize annual payments (20% discount) to increase cash flow for further development.

---
**Disclaimer**: These figures are estimates for planning purposes and may vary based on actual cloud consumption and market dynamics.
