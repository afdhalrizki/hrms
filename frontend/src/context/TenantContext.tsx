'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface TenantContextType {
  tenantName: string;
  subdomain: string;
  isPublic: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantContextType>({
    tenantName: 'Public',
    subdomain: '',
    isPublic: true,
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
        });
        return;
      }

      // Check if hostname ends with the suffix
      if (hostname.endsWith(`.${domainSuffix}`)) {
        const subdomain = hostname.replace(`.${domainSuffix}`, '');
        if (subdomain && subdomain !== 'www' && subdomain !== 'public') {
          setTenant({
            tenantName: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
            subdomain: subdomain,
            isPublic: false,
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
