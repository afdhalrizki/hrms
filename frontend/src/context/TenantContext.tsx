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
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  expiryDate?: string;
  planType?: string;
  isSubscriptionActive?: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantContextType>({
    tenantName: 'Public',
    subdomain: '',
    isPublic: true,
    isLoading: true,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // Get the configured domain suffix from env, fallback to 'localhost'
      const domainSuffix = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX || 'localhost';
      
      // If hostname is exactly the domain suffix or localhost, it's public
      if (hostname === domainSuffix || hostname === 'localhost' || hostname === '127.0.0.1') {
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
          apiFetch('/tenant/settings/')
            .then((data) => {
              setTenant(prev => ({
                ...prev,
                tenantName: data.name || prev.tenantName,
                logo: data.logo,
                address: data.address,
                phone: data.phone,
                subscriptionStatus: data.subscription_status,
                expiryDate: data.expiry_date,
                planType: data.plan_type,
                isSubscriptionActive: data.is_subscription_active,
                isLoading: false,
              }));
            })
            .catch((err) => {
              console.error('Failed to fetch tenant settings:', err);
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
