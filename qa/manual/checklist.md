# MANUAL TESTING CHECKLIST - HRMS SAAS

## 1. Multi-Tenancy
- [ ] Ensure `company1.harikerja.com` cannot see data from `company2.harikerja.com`.
- [ ] Verify login redirection to correct tenant domain.

## 2. Attendance & Biometrics
- [ ] Test check-in with a photo of a person (not a live face).
- [ ] Test check-in outside the 100m geofence radius.

## 3. Payroll
- [ ] Verify PPh 21 calculation against manual Excel calculation (TER 2024).
- [ ] Check BPJS deductions for different salary brackets.
