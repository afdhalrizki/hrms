# Business Projections & Financial Model (Targeting Rp 50 Million Monthly Profit)

This document details the financial model, unit economics, and two operational setups (Low OpEx vs. High OpEx) required to achieve a net monthly profit of **Rp 50,000,000** for the **HariKerja HRMS** SaaS platform.

---

## 📊 1. Average Revenue Per User (ARPU) Assumptions

The HariKerja platform is marketed under three primary plans:
1.  **Essential**: Rp125,000 /month.
2.  **Professional**: Rp750,000 /month.
3.  **Premium**: Rp1,500,000 /month.

Based on industry research for Indonesian B2B HR SaaS apps, we model the following tenant plan distribution:
*   **60%** choose the *Essential* plan (focused on geofenced attendance and leaves).
*   **30%** choose the *Professional* plan (incorporating PPh 21 TER tax payroll processing).
*   **10%** choose the *Premium* plan (larger companies utilizing advanced RBAC & KPIs).

This distribution results in a monthly **ARPU (Average Revenue Per User/Tenant)** of:
$$\text{ARPU} = (0.60 \times 125,000) + (0.30 \times 750,000) + (0.10 \times 1,500,000)$$
$$\text{ARPU} = 75,000 + 225,000 + 150,000 = \text{Rp450,000 per tenant/month}$$

---

## 📈 2. Operational Scenarios to Achieve Rp 50M Profit

To realize a net profit of Rp 50,000,000 /month, we model two distinct OpEx configurations:

### 🏢 Scenario A: Low OpEx / Bootstrap Setup
This scenario assumes the team operates as a lean, bootstrapped startup, with the co-founders managing multiple cross-functional responsibilities.

*   **Monthly Operational Expenses (OpEx) Breakdown**:
    *   *Cloud Hosting (AWS/DigitalOcean)*: Rp2,500,000
    *   *Third-Party Integrations (Midtrans, SendGrid, Sentry)*: Rp1,500,000
    *   *Digital Marketing / Paid Search*: Rp2,000,000
    *   *Junior Support Staff Salary*: Rp4,000,000
    *   *Total Monthly OpEx*: **Rp10,000,000**
*   **Required Gross Monthly Revenue**:
    $$\text{Target Revenue} = \text{Target Profit} + \text{OpEx}$$
    $$\text{Target Revenue} = 50,000,000 + 10,000,000 = \text{Rp60,000,000 /month}$$
*   **Target Active Tenant Count**:
    $$\text{Target Tenants} = \frac{\text{Target Revenue}}{\text{ARPU}} = \frac{60,000,000}{450,000} \approx \mathbf{134\text{ Tenants}}$$
*   **Tenant Plan Distribution**:
    *   Essential: 80 Tenants (Rp10,000,000)
    *   Professional: 40 Tenants (Rp30,000,000)
    *   Premium: 14 Tenants (Rp21,000,000)
    *   *Total Revenue Realized*: Rp61,000,000

---

### 🚀 Scenario B: High OpEx / Growth Setup
This scenario assumes the company secures Seed or Angel funding to hire a dedicated professional engineering team, accelerate features release, and increase market share.

*   **Monthly Operational Expenses (OpEx) Breakdown**:
    *   *High Availability AWS Infrastructure & Backup systems*: Rp15,000,000
    *   *SaaS Tooling & Security Compliance audits*: Rp5,000,000
    *   *Engineering Salaries (2 Backend, 2 Frontend, 1 DevOps)*: Rp45,000,000
    *   *Sales (2) & Onboarding Support (2) Salaries*: Rp20,000,000
    *   *B2B Marketing & Enterprise Outreach events*: Rp15,000,000
    *   *Office Space Rental & Utilities*: Rp10,000,000
    *   *Total Monthly OpEx*: **Rp110,000,000**
*   **Required Gross Monthly Revenue**:
    $$\text{Target Revenue} = 50,000,000 + 110,000,000 = \text{Rp160,000,000 /month}$$
*   **Target Active Tenant Count**:
    $$\text{Target Tenants} = \frac{160,000,000}{450,000} \approx \mathbf{356\text{ Tenants}}$$
*   **Tenant Plan Distribution**:
    *   Essential: 214 Tenants (Rp26,750,000)
    *   Professional: 107 Tenants (Rp80,250,000)
    *   Premium: 35 Tenants (Rp52,500,000)
    *   *Total Revenue Realized*: Rp159,500,000

---

## 🎯 3. Scenario Comparison & Recommendation

| Metric | Scenario A (Low OpEx) | Scenario B (High OpEx) |
| :--- | :--- | :--- |
| **Operational Model** | Bootstrapped (Founder-led) | Funded (Professional Team) |
| **Monthly OpEx** | Rp10,000,000 | Rp110,000,000 |
| **Active Tenants Required** | 134 Tenants | 356 Tenants |
| **Total Active Employees Managed** | ~4,500 employees | ~12,000 employees |
| **Technical Risk** | Medium (Slower bug responses) | Low (Automated QA & DevOps) |
| **Growth Velocity** | Slow & Steady | Fast & Aggressive |

### Strategic Recommendation:
1.  **Phase 1 (Months 1-6)**: Launch under Scenario A (Low OpEx). Acquire the first 50 tenants to establish product reliability and secure positive cash flows without high payroll commitments.
2.  **Phase 2 (Months 7+)**: After achieving consistent cash flow, incrementally upgrade cloud capacity and hire dedicated support staff. Progressively transition to Scenario B to capture larger corporate market segments.
