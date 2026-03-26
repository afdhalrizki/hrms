# harikerja Mobile Feature Audit & Gap Analysis

This document provides a technical audit of the current mobile feature set as of March 26, 2026. It identifies gaps between the UI/Documentation and the actual implementation.

## 📊 Summary of Feature Maturity

| Feature Area | UI Implementation | API Integration | Documentation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | ✅ Finished | ✅ Dynamic | ✅ Complete | **Ready** |
| **Attendance (Face ID)** | ✅ Finished | ✅ Dynamic | ✅ Complete | **Ready** |
| **Profile Management** | ✅ Finished | ✅ Dynamic | ✅ Complete | **Ready** |
| **Leave Management** | ✅ Finished | ✅ Dynamic | ⚠️ Partial | **Hardening Needed** |
| **Reimbursement** | ✅ Finished | ✅ Dynamic | ⚠️ Partial | **Hardening Needed** |
| **Payslips** | ⚠️ Mockup | ❌ Missing GET | ❌ Incomplete | **Not Ready** |
| **KPI / Performance** | ✅ Finished | ✅ Dynamic | ✅ Complete | **Ready** |
| **Dashboard** | ✅ Finished | ⚠️ Partial (Mocked Activity) | ✅ Complete | **Polishing Needed** |
| **L10n (i18n)** | ⚠️ Partial | N/A | ❌ Missing | **Incomplete** |

---

## 🔍 Detailed Gap Analysis

### 1. Internationalization (i18n)
- **Current State**: `l10n.yaml` and `.arb` files exist, but only contain 12 basic keys. Most strings in `lib/screens/` are hardcoded.
- **Missing**:
    - Full coverage for Leave, Reimbursement, and Performance screens.
    - Integration in `main.dart` (currently commented out).
    - Context-aware localized strings in validators and error messages.

### 2. Payslip Module
- **Current State**: `payslip_screen.dart` is a static UI walkthrough.
- **Missing**:
    - `ApiService.getPayslips()`: Fetch list of history.
    - `ApiService.getPayslipDetail(id)`: Fetch specific breakdown.
    - Real data binding in the UI (currently using hardcoded "Feb 2026" data).
    - Production-grade PDF handler (currently prints to console).

### 3. Home Dashboard Dynamism
- **Current State**: Top section (Profile/Attendance) is dynamic. Bottom section (Recent Activity/Shift) is static.
- **Missing**:
    - API endpoint for "Recent Activities" (Audit logs for individual employees).
    - Dynamic mapping of the "Shift Info" based on the `getMySchedules()` result.

### 4. Authentication Resilience
- **Current State**: Basic JWT login and storage.
- **Missing**:
    - **JWT Refresh**: The app does not currently handle token expiration (401 errors) by using a refresh token.
    - **Auto-Logout**: No listener for session invalidation.

### 5. Document Management
- **Current State**: Camera capture and upload work for single files.
- **Missing**:
    - **Preview**: Ability to view uploaded KTP/NPWP after submission.
    - **Validation**: File size and type constraints in the mobile UI.

---

## 🚀 Execution Roadmap for Future Phases

### Immediate Next Steps
1.  **Uncomment L10n**: Enable `AppLocalizations` in `main.dart` and begin migrating hardcoded strings to `app_en.arb`.
2.  **Harden Payslips**: Implement `getPayslips` in `ApiService` and bind the `PayslipScreen` to the resulting model.
3.  **Recent Activity**: Add a "Recent Activities" section to the `HomeScreen` that fetches the last 5 `WorkflowAction` or `Attendance` records.
4.  **PDF Handler**: Integrate `path_provider` and `open_file_plus` for real PDF viewing on physical devices.
