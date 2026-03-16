# harikerja HRMS SaaS Frontend (Next.js)

The premium, high-performance admin dashboard for the **harikerja HRMS** ecosystem. Built with Next.js 14 and TypeScript, following the latest App Router patterns for optimal SEO and user experience.

## ✨ High-End Features

- **Multi-Tenant Experience**: Automatic tenant detection via subdomain parsing.
- **Premium Aesthetics**: Glassmorphism UI design with smooth Framer Motion transitions and dark-mode optimization.
- **Identity Hydration**: Real-time user profile management integrated with the unified backend identity API.
- **Executive Analytics**: Dynamic charts for headcount, attendance trends, and HR cost distribution.
- **Self-Service Onboarding**: Integrated registration flow for new customers with real-time validation.
- **Tenant Workspace Customization**: Settings dashboard for admins to upload branding logos and contact details dynamically mapped across the UI.

## 🖼 UI Previews

### Admin Dashboard
![Dashboard Preview](../docs/assets/dashboard_preview.png)
*Modern, glassmorphism-based dashboard with real-time analytics indicators.*

### Premium Signup
![Signup Preview](../docs/assets/signup_page_premium_harikerja.png)
*Seamless tenant onboarding with instant domain validation.*

## 🛠 Tech Stack

- **Core**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & Vanilla CSS (Design System)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Testing**: Vitest & React Testing Library

## 📁 Key Components

- `src/app/`: File-based routing including Signup, Login, and Dashboard.
- `src/context/`: Tenant and Auth state management.
- `src/components/`: Reusable UI components (Sidebar, Charts, Cards).
- `src/lib/`: API client and utility helpers.

---

## 1. Setup & Installation

### Install Dependencies
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the public portal.

---

## 2. Multi-Tenant Development

To test tenant-specific dashboards (e.g., `company1`), update your local `hosts` file:
```text
127.0.0.1 company1.harikerja.com
```
Then access [http://company1.harikerja.com:3000](http://company1.harikerja.com:3000).

---

## 3. Testing

Verify core logic and UI components:
```bash
npm test
```
**Coverage**: 100% logic coverage for critical helpers (`api.ts`, `TenantContext.tsx`, `AuthContext.tsx`).

---
**Branding Note**: This project was rebranded to **harikerja** on March 16, 2026.
