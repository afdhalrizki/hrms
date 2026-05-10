# Authentication Comparison: Web vs. Mobile

This document explains the conceptual and technical differences between how authentication and navigation are handled in the HRMS Web (Frontend) and Mobile (Flutter) applications.

## 1. Core Architectural Differences

| Feature | Web (Frontend) | Mobile (Flutter) |
| :--- | :--- | :--- |
| **Primary Navigation** | URL-based (Routes) | Stack-based (Screens) |
| **Gatekeeper** | Layout Guards (`DashboardLayout`) | Startup Logic (`initState`) |
| **Tenant Identification** | Automatic (via Hostname/Subdomain) | Manual (User enters Subdomain) |
| **Token Storage** | `localStorage` | `FlutterSecureStorage` (Encrypted) |

---

## 2. Web Authentication Flow (The "Guard" Concept)

In the web application, navigation is driven by the URL. Because users can "jump" to any URL (e.g., typing `/en/attendance` directly), the system uses a **Layout Guard** pattern.

- **How it works**: The `DashboardLayout` wraps every protected page. Every time a page is loaded or refreshed, the layout checks if a valid token exists.
- **Behavior**: If no token is found, the user is immediately redirected to `/login`.
- **Tenant Context**: The tenant is identified by the browser's current address (e.g., `company-a.harikerja.web.id`).

## 3. Mobile Authentication Flow (The "Startup" Concept)

In the mobile application, there are no URLs. Navigation is managed by pushing and popping screens on a stack.

- **How it works**: The app always starts at the `LoginScreen`. Inside its initialization logic, it checks the encrypted storage for a saved token.
- **Behavior**: 
    - If a token exists, it performs an "Auto-Login" by replacing the `LoginScreen` with the `HomeScreen`.
    - If no token exists, it shows the login form.
- **Tenant Context**: Since there is only one mobile app for all companies, the user must manually input their **Company Subdomain** so the app knows which server to connect to.

---

## 4. Summary for Developers

- **Web Developers**: Focus on ensuring all protected pages are wrapped in `DashboardLayout` to keep the "Guard" active.
- **Mobile Developers**: Focus on the `ApiService` singleton to ensure the `X-Tenant-Domain` header is correctly sent with every request based on the manually entered subdomain.
- **Shared**: Both platforms use the exact same JWT-based backend endpoints (`/auth/login/`, `/auth/token/refresh/`).
