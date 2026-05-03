'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { useTenant } from '@/context/TenantContext';
import { SubscriptionBanner } from './SubscriptionBanner';
import { SuspendedOverlay } from './SuspendedOverlay';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      // If there is no token and auth has finished loading, redirect to /login
      if (!loading && !user && !token) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  if (!user && process.env.NODE_ENV !== 'test') {
    // Return null if there is no token at all, meaning completely unauthenticated
    if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
      return null;
    }
  }


  return (
    <div className="min-h-screen bg-background text-foreground">
      {loading && process.env.NODE_ENV !== 'test' && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden z-50">
          <div className="h-full bg-primary w-1/3 rounded-full animate-progress" style={{
            animation: 'progress 1s ease-in-out infinite alternate'
          }} />
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes progress {
              0% { transform: translateX(-100%); width: 30%; }
              100% { transform: translateX(350%); width: 40%; }
            }
          `}} />
        </div>
      )}
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
        <header className="h-20 glass-nav flex items-center justify-between px-10 sticky top-0 z-30 border-b border-white/5 backdrop-blur-[15px]">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Dashboard</span>
            <span className="text-muted-foreground/20 font-light">/</span>
            <span className="text-sm font-black tracking-tight text-foreground/80">System Overview</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Managed by</span>
              <div className="px-4 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-black border border-primary/20 shadow-sm shadow-primary/5 uppercase tracking-tighter">
                {tenant.tenantName}
              </div>
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
