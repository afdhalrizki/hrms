# Implementation Plan - Config Module Test Expansion

Expand the `config` module's unit tests to ensure robust coverage for infrastructure, middleware, and multi-tenancy settings.

## Proposed Changes

### [Backend] [config]

#### [MODIFY] [tests.py](file:///d:/hr/hrms/backend/config/tests.py)
- Expand `ConfigSmokeTestCase` with the following:
  - `test_subscription_middleware_enforcement`: Verify that `SubscriptionMiddleware` correctly blocks (402) or allows `GET` (Read-Only) requests for expired/suspended tenants.
  - `test_cors_configuration`: Verify `CORS_ALLOWED_ORIGIN_REGEXES` by simulating requests with different `Origin` headers.
  - `test_i18n_localization`: Verify `LocaleMiddleware` by passing `Accept-Language` headers and checking the response content or `request.LANGUAGE_CODE` indirectly.
  - `test_cache_configuration`: Verify that `django.core.cache` is correctly configured and functional.
  - `test_secure_headers`: Verify `X-Frame-Options` and other security headers are present.

## Verification Plan

### Automated Tests
- Run the expanded config tests:
  ```powershell
  venv\Scripts\python manage.py test config.tests -v 2
  ```
- Run full suite to ensure no regressions:
  ```powershell
  venv\Scripts\python manage.py test -v 2
  ```
