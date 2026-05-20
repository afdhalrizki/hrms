# Authentication Architecture: Web vs. Mobile

This document details the architectural comparisons, runtime mechanisms, and decision flowcharts of the authentication systems implemented in the Web (Next.js) and Mobile (Flutter) applications of the **HariKerja HRMS** platform.

---

## 🏗️ 1. Core Architectural Differences

| Feature | Web (Next.js) | Mobile (Flutter) |
| :--- | :--- | :--- |
| **Primary Navigation** | URL Route-Based (Next.js App Router) | Screen Stack-Based Navigation |
| **Access Control** | Layout Guard Pattern (`DashboardLayout.tsx`) | Startup Lifecycle Initialization (`initState` & State) |
| **Tenant Domain Resolution** | Automated (parsed from browser hostname/subdomain) | Manual (user-entered subdomain during onboarding) |
| **JWT Storage** | Browser `localStorage` / Secure Session Cookies | Hardware-Backed `FlutterSecureStorage` (Encrypted) |
| **API Identification Header** | Intercepts request to inject domain into headers | `X-Tenant-Domain` header on every outbound HTTP request |

---

## 🌐 2. Web Authentication Mechanism & Flow (Next.js)

Since Next.js application navigation is driven by browser URLs (allowing users to bookmark or type `/en/attendance` directly), the web system enforces a **Layout Guard** at the root layout level.

```mermaid
flowchart TD
    Start([User Accesses Web Route]) --> CheckPublic{Is Route Public?\n- /login, /signup\n- /about, /}
    
    CheckPublic -- Yes --> RenderPage[Render Page Directly]
    CheckPublic -- No --> CheckLocalToken{Is access_token present \nin LocalStorage?}
    
    CheckLocalToken -- No --> RedirectLogin[Redirect to /login \nand store origin route]
    CheckLocalToken -- Yes --> ShowSpinner[Display Loading Spinner / \nSkeleton UI]
    
    ShowSpinner --> FetchMe[Send Request to GET /users/me]
    FetchMe --> CheckSuccess{Is Request Successful?}
    
    CheckSuccess -- Yes --> UpdateState[Store User Profile in AuthContext\nand render protected page]
    CheckSuccess -- Fail: 401 Unauthorized --> TryRefresh{Is refresh_token \npresent?}
    
    TryRefresh -- Yes --> PostRefresh[Send Request POST /auth/token/refresh/]
    PostRefresh -- Success --> SaveNewTokens[Save New Tokens in LocalStorage]
    SaveNewTokens --> FetchMe
    PostRefresh -- Fail --> ClearTokens[Clear Tokens & Redirect to /login]
    
    TryRefresh -- No --> ClearTokens
    UpdateState --> RenderProtected[Render Protected Page Content]

    classDef success fill:#10B981,stroke:#059669,color:#fff;
    classDef fail fill:#EF4444,stroke:#DC2626,color:#fff;
    classDef step fill:#3B82F6,stroke:#2563EB,color:#fff;
    classDef decision fill:#F59E0B,stroke:#D97706,color:#fff;
    
    class RenderPage,RenderProtected success;
    class RedirectLogin,ClearTokens fail;
    class ShowSpinner,FetchMe,UpdateState,PostRefresh,SaveNewTokens step;
    class CheckPublic,CheckLocalToken,CheckSuccess,TryRefresh decision;
```

*   **Next.js Middleware & Context**: `TenantContext` resolves the tenant subdomain from the URL (e.g., `ptmaju.harikerja.com`) before any auth checks are executed.
*   **API Interceptor**: Utilizes a custom `apiFetch.ts` wrapper. If a network call returns `401 Unauthorized`, the interceptor halts outbound calls, triggers a token refresh, and retries the original request with the new access token.

---

## 📱 3. Mobile Authentication Mechanism & Flow (Flutter)

The ESS Flutter mobile application does not have a browser URL routing system, so screen security is managed by validating JWT presence in the application startup widget lifecycle.

```mermaid
flowchart TD
    Start([Open Mobile App]) --> ReadStorage[Read SecureStorage for tokens & subdomain]
    ReadStorage --> CheckSubdomain{Is Subdomain \nSaved?}
    
    CheckSubdomain -- No --> ShowTenantInput[Display Subdomain Onboarding Screen]
    CheckSubdomain -- Yes --> CheckToken{Is access_token \nSaved?}
    
    ShowTenantInput --> InputSub[User inputs Subdomain & validate]
    InputSub --> PingTenant[GET /tenant/validate/]
    PingTenant -- Registered --> SaveSub[Save Subdomain to SecureStorage]
    SaveSub --> CheckToken
    PingTenant -- Not Registered --> ShowSubError[Show Subdomain Error Alert]
    ShowSubError --> ShowTenantInput
    
    CheckToken -- No --> ShowLogin[Display Login Screen]
    CheckToken -- Yes --> FetchProfile[Send GET /users/me \nHeader: X-Tenant-Domain = subdomain]
    
    ShowLogin --> SubmitLogin[Post Credentials via POST /auth/login/]
    SubmitLogin -- Success --> SaveTokens[Save JWT to SecureStorage]
    SaveTokens --> FetchProfile
    SubmitLogin -- Fail --> ShowLoginError[Display Credentials Error Alert]
    ShowLoginError --> ShowLogin
    
    FetchProfile -- Success --> SaveProfileState[Save Profile details to State Manager]
    SaveProfileState --> GoHome[Redirect to Home Screen Widget]
    
    FetchProfile -- Fail: 401 Unauthorized --> TryRefresh{Is refresh_token \npresent?}
    TryRefresh -- Yes --> PostRefresh[Send POST /auth/token/refresh/]
    PostRefresh -- Success --> SaveNewTokens[Save New Tokens to SecureStorage]
    SaveNewTokens --> FetchProfile
    PostRefresh -- Fail --> ClearAll[Clear All Session Data]
    ClearAll --> ShowLogin
    TryRefresh -- No --> ClearAll

    classDef success fill:#10B981,stroke:#059669,color:#fff;
    classDef fail fill:#EF4444,stroke:#DC2626,color:#fff;
    classDef step fill:#3B82F6,stroke:#2563EB,color:#fff;
    classDef decision fill:#F59E0B,stroke:#D97706,color:#fff;
    
    class GoHome success;
    class ShowSubError,ShowLoginError,ClearAll fail;
    class ReadStorage,ShowTenantInput,InputSub,PingTenant,SaveSub,ShowLogin,SubmitLogin,SaveTokens,FetchProfile,SaveProfileState,PostRefresh,SaveNewTokens step;
    class CheckSubdomain,CheckToken,TryRefresh decision;
```

*   **Secure Storage**: Uses the `FlutterSecureStorage` library, which utilizes Keychains (iOS) and Keystores (Android) to safeguard JWT tokens from physical storage dump attacks.
*   **API Interceptor**: The Flutter `ApiService` singleton automatically appends the `X-Tenant-Domain` header on every outbound network request.

---

## 🔒 4. JWT Security Best Practices

To protect user sessions, the platform enforces the following policies:
1.  **Short Access Lifespans**: Access tokens are configured to expire in 24 hours to limit vulnerability windows in case of token leakage. Refresh tokens last 7 days.
2.  **Server-Side Blacklisting**: When a user logs out, a request is dispatched to `/api/auth/logout/` which registers the `refresh_token` in the database blacklist. Subsequent refresh attempts using this token are rejected.
3.  **Strict CORS Headers**: API responses utilize tight CORS controls, restricting valid origin requests to verified tenant subdomains in the `public` schema.
