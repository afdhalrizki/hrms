'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { useTenant } from '@/context/TenantContext';
import { SubscriptionBanner } from './SubscriptionBanner';
import { SuspendedOverlay } from './SuspendedOverlay';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from '@/i18n/routing';
import { HelpSupportWidget } from '../shared/HelpSupportWidget';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();
  const { user, loading, logout } = useAuth();
  const tCommon = useTranslations('Common');

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  const isPublicRoute = React.useMemo(() => {
    const publicRoutes = ['/about', '/signup', '/login', '/registration'];
    
    // 1. Get raw path from window if available, else use pathname from next-intl
    let rawPath = pathname;
    if (typeof window !== 'undefined') {
      rawPath = window.location.pathname;
    }
    
    if (!rawPath) return true; // Default to safe if unknown

    // 2. Normalize: remove locale prefix (e.g., /en/profile -> /profile)
    const normalizedPath = rawPath.replace(/^\/(en|id)(\/|$)/, '/').replace(/\/$/, '') || '/';
    const finalPath = normalizedPath.toLowerCase();
    
    // 3. Check against public list
    const isPublic = publicRoutes.some(route => finalPath === route || finalPath.startsWith(route + '/')) || 
                     finalPath.includes('/login') || 
                     (tenant.isPublic && finalPath === '/');
                     
    return isPublic;
  }, [pathname, tenant.isPublic]);

  const hasToken = React.useMemo(() => {
    if (!mounted || typeof window === 'undefined') return false; 
    return !!localStorage.getItem('access_token');
  }, [loading, user, mounted]);

  const isTest = process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_E2E === 'true';

  // REDIRECT LOGIC
  React.useEffect(() => {
    if (!mounted || typeof window === 'undefined' || isRedirecting) return;

    const token = localStorage.getItem('access_token');

    // If it's a public route, ensure we are not in redirecting state anymore
    if (isPublicRoute) {
      return;
    }

    // 1. Immediate redirect if no token is found
    if (!token) {
      setIsRedirecting(true);
      router.push('/login');
      return;
    }

    // 2. Redirect if auth finished and no user
    if (!loading && !user) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setIsRedirecting(true);
      router.push('/login');
    }
  }, [user, loading, router, isPublicRoute, mounted, isRedirecting]);

  React.useEffect(() => {
    if (!isTest && !isPublicRoute && loading && hasToken && mounted && !isRedirecting) {
      const timer = setTimeout(() => {
        console.warn('[DashboardLayout] Auth timeout reached, forcing redirect...');
        setIsRedirecting(true);
        window.location.href = '/en/login';
      }, 90000); // 90 seconds in E2E to allow for slow backend responses
      return () => clearTimeout(timer);
    }
  }, [isPublicRoute, loading, hasToken, mounted, router, isRedirecting]);

  // 3. While redirecting or initial loading without token on private route, return null
  // We bypass this in tests to allow components to render and be inspected
  if (!isPublicRoute && (isRedirecting || !hasToken)) {
    return null;
  }

  // 4. If loading with token on private route, return null (blank page) but keep top bar active
  // The useEffect above will handle the timeout or success
  if (!isTest && !isPublicRoute && loading && hasToken) {
    return (
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-primary/20 overflow-hidden z-[100]">
        <div className="h-full bg-primary animate-progress-fast" />
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes progress-fast {
            0% { transform: translateX(-100%); width: 30%; }
            100% { transform: translateX(400%); width: 30%; }
          }
          .animate-progress-fast {
            animation: progress-fast 0.8s linear infinite;
          }
        `}} />
      </div>
    );
  }

  // 5. Final Guard: Only render private content if we have a user and are not loading
  // Public routes are always rendered.
  if (!isPublicRoute && (!user || loading)) {
    // If we have a token but are loading, show the top progress bar (handled above)
    // If we have no user and are not loading, the redirect useEffect will handle it
    // For now, return null to prevent children (private pages) from mounting and fetching data
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Progress Bar for subtle loading indication */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden z-50">
          <div className="h-full bg-primary w-1/3 rounded-full animate-progress" />
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes progress {
              0% { transform: translateX(-100%); width: 30%; }
              100% { transform: translateX(350%); width: 40%; }
            }
            .animate-progress {
              animation: progress 1s ease-in-out infinite alternate;
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
        <header className="h-20 glass-nav flex items-center justify-between px-10 sticky top-0 z-30 border-b border-white/5 backdrop-blur-[15px]">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Dashboard</span>
            <span className="text-muted-foreground/20 font-light">/</span>
            <span className="text-sm font-black tracking-tight text-foreground/80">System Overview</span>
          </div>
          <div className="flex items-center gap-6">
            {/* User Profile Card */}
            <div className="glass-card rounded-[1.25rem] px-4 py-2 border border-white/10 flex items-center gap-3 shadow-inner group/user cursor-pointer hover:bg-white/5 transition-all">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-accent font-black text-xs border border-accent/10 shadow-lg">
                {loading ? '...' : getInitials(user?.fullname || user?.email || 'Admin')}
              </div>
              <div className="hidden sm:block text-left max-w-[150px]">
                <p data-testid="sidebar-fullname" className="text-xs font-bold truncate group-hover/user:text-accent transition-colors">
                  {loading ? tCommon('loading') : (user?.fullname || 'Admin User')}
                </p>
                <p className="text-[9px] text-muted-foreground truncate font-medium uppercase tracking-tight opacity-60">
                  {user?.email || 'admin@hrms.com'}
                </p>
              </div>
              <button 
                onClick={logout}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:scale-110 active:scale-95 transition-all shrink-0" 
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <HelpSupportWidget />
    </div>
  );
}
