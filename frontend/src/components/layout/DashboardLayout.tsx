'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { useTenant } from '@/context/TenantContext';
import { SubscriptionBanner } from './SubscriptionBanner';
import { SuspendedOverlay } from './SuspendedOverlay';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          ${tenant.themePrimaryColor ? `--primary: ${tenant.themePrimaryColor};` : ''}
          ${tenant.themeSecondaryColor ? `--secondary: ${tenant.themeSecondaryColor};` : ''}
        }
      `}} />
      <SuspendedOverlay />
      <Sidebar />
      <main className="pl-64 min-h-screen flex flex-col">
        <SubscriptionBanner />
        {/* Top Navbar */}
        <header className="h-16 glass-nav flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Dashboard</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-semibold">Overview</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 uppercase tracking-wider">
              {tenant.tenantName}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
