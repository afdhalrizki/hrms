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
      const parts = hostname.split('.');
      
      if (parts.length > 2 || (parts.length === 2 && parts[1] !== 'localhost')) {
        const subdomain = parts[0];
        if (subdomain !== 'localhost' && subdomain !== 'www') {
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
