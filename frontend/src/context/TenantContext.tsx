'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface TenantContextType {
  tenantName: string;
  subdomain: string;
  isPublic: boolean;
  logo?: string;
  address?: string;
  phone?: string;
  isLoading: boolean;
  themePrimaryColor?: string;
  themeSecondaryColor?: string;
  planType?: string;
  enabledModules?: string[];
  subscriptionStatus?: string;
  expiryDate?: string;
  isSubscriptionActive?: boolean;
  // Quota Fields
  storageUsedBytes?: number;
  totalStorageCapacityMb?: number;
  employeeCount?: number;
  totalEmployeeCapacity?: number;
  // Payroll & Attendance Settings
  lateDeductionRate?: number;
  absenceDeductionRate?: number;
  jkkRate?: number;
  reimbursementApprovalLevel?: string;
  overtimeRate?: number;
  payrollOvertimeDivisor?: number;
  leaveApprovalLevel?: string;
  overtimeApprovalLevel?: string;
  isBiometricEnabled?: boolean;
  attendancePlatformPolicy?: 'MOBILE' | 'BOTH';
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantContextType>({
    tenantName: 'Public',
    subdomain: '',
    isPublic: true,
    isLoading: true,
    subscriptionStatus: 'ACTIVE',
    enabledModules: [],
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
      
      // Get the configured domain suffix from env, fallback to 'localhost'
      const domainSuffix = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX || 'localhost';
      
      // Check for URL parameter override (more precise for E2E)
      const urlParams = new URLSearchParams(window.location.search);
      const testTenantUrl = urlParams.get('test_tenant');
      
      // Try to recover from sessionStorage for E2E persistence across navigation
      const storedTestTenant = isLocal ? sessionStorage.getItem('test_tenant_e2e') : null;
      const testTenant = testTenantUrl || storedTestTenant;

      // Special override for E2E testing on localhost
      if (testTenant && isLocal) {
        if (testTenant === 'public') {
          sessionStorage.setItem('test_tenant_e2e', 'public');
          setTenant({
            tenantName: 'Public',
            subdomain: '',
            isPublic: true,
            isLoading: false,
          });
          return;
        }

        // Persist for next navigation
        sessionStorage.setItem('test_tenant_e2e', testTenant);
        
        const initialName = testTenant.charAt(0).toUpperCase() + testTenant.slice(1);
        setTenant(prev => ({
          ...prev,
          tenantName: initialName,
          subdomain: testTenant,
          isPublic: false,
          isLoading: true,
        }));

        apiFetch('/tenant/settings')
          .then((data) => {
            setTenant(prev => ({
              ...prev,
              tenantName: data.name || initialName,
              logo: data.logo,
              themePrimaryColor: data.theme_primary_color,
              themeSecondaryColor: data.theme_secondary_color,
              address: data.address,
              phone: data.phone,
              subscriptionStatus: data.subscription_status,
              expiryDate: data.expiry_date,
              planType: data.plan_type,
              enabledModules: data.enabled_modules,
              isSubscriptionActive: data.is_subscription_active,
              storageUsedBytes: data.storage_used_bytes,
              totalStorageCapacityMb: data.total_storage_capacity_mb,
              employeeCount: data.employee_count,
              totalEmployeeCapacity: data.total_employee_capacity,
              lateDeductionRate: data.late_deduction_rate,
              absenceDeductionRate: data.absence_deduction_rate,
              jkkRate: data.jkk_rate,
              reimbursementApprovalLevel: data.reimbursement_approval_level,
              overtimeRate: data.overtime_rate,
              payrollOvertimeDivisor: data.payroll_overtime_divisor,
              leaveApprovalLevel: data.leave_approval_level,
              overtimeApprovalLevel: data.overtime_approval_level,
              isBiometricEnabled: data.is_biometric_enabled,
              attendancePlatformPolicy: data.attendance_platform_policy,
              isLoading: false,
            }));
          })
          .catch(() => setTenant(prev => ({ ...prev, isLoading: false })));
        return;
      }
      
      // If hostname is exactly the domain suffix or localhost, it's public
      if (hostname === domainSuffix || isLocal) {
        setTenant({
          tenantName: 'Public',
          subdomain: '',
          isPublic: true,
          isLoading: false,
        });
        return;
      }

      // Check if hostname ends with the suffix
      if (hostname.endsWith(`.${domainSuffix}`)) {
        const subdomain = hostname.replace(`.${domainSuffix}`, '');
        if (subdomain && subdomain !== 'www' && subdomain !== 'public') {
          const initialName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
          
          // Set initial fallback from URL
          setTenant(prev => ({
            ...prev,
            tenantName: initialName,
            subdomain: subdomain,
            isPublic: false,
            isLoading: true,
          }));

          // Fetch true tenant profile including logo
          apiFetch('/tenant/settings')
            .then((data) => {
              setTenant(prev => ({
                ...prev,
                tenantName: data.name || prev.tenantName,
                logo: data.logo,
                themePrimaryColor: data.theme_primary_color,
                themeSecondaryColor: data.theme_secondary_color,
                address: data.address,
                phone: data.phone,
                subscriptionStatus: data.subscription_status,
                expiryDate: data.expiry_date,
                planType: data.plan_type,
                enabledModules: data.enabled_modules,
                isSubscriptionActive: data.is_subscription_active,
                storageUsedBytes: data.storage_used_bytes,
                totalStorageCapacityMb: data.total_storage_capacity_mb,
                employeeCount: data.employee_count,
                totalEmployeeCapacity: data.total_employee_capacity,
                lateDeductionRate: data.late_deduction_rate,
                absenceDeductionRate: data.absence_deduction_rate,
                jkkRate: data.jkk_rate,
                reimbursementApprovalLevel: data.reimbursement_approval_level,
                overtimeRate: data.overtime_rate,
                payrollOvertimeDivisor: data.payroll_overtime_divisor,
                leaveApprovalLevel: data.leave_approval_level,
                overtimeApprovalLevel: data.overtime_approval_level,
                isBiometricEnabled: data.is_biometric_enabled,
                attendancePlatformPolicy: data.attendance_platform_policy,
                isLoading: false,
              }));
            })
            .catch((err) => {
              setTenant(prev => ({ ...prev, isLoading: false }));
            });
        }
      }
    }
  }, []);

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
