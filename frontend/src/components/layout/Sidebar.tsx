'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  LayoutDashboard, 
  Settings, 
  ChevronRight,
  Briefcase,
  BarChart2,
  Receipt,
  MapPin,
  GitMerge,
  TrendingUp,
  FileText,
  Palette,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { getBaseUrl } from '@/lib/api';
import { LanguageSwitcher } from './LanguageSwitcher';
import { usePermission } from '@/hooks/usePermission';


const menuItems = [
  { nameKey: 'overview',   icon: LayoutDashboard, href: '/' },
  { nameKey: 'profile',    icon: Users,            href: '/profile' },
  { nameKey: 'employees', icon: Users,            href: '/employees', requiredPermission: 'manage_hr' },
  { nameKey: 'performance', icon: TrendingUp,     href: '/performance', module: 'performance' },
  { nameKey: 'branches',  icon: MapPin,           href: '/branches',  requiredPermission: 'manage_hr' },
  { nameKey: 'attendance',icon: Calendar,         href: '/attendance' },
  { nameKey: 'leaves',    icon: Briefcase,        href: '/leaves' },
  { nameKey: 'reimbursements', icon: Receipt,      href: '/reimbursements' },
  { nameKey: 'payroll',   icon: CreditCard,       href: '/payroll',   requiredPermission: 'manage_payroll' },
  { nameKey: 'workflows', icon: GitMerge,         href: '/workflows', requiredPermission: 'manage_settings' },
  { nameKey: 'analytics', icon: BarChart2,        href: '/analytics', requiredPermission: 'manage_hr' },
  { nameKey: 'reports',   icon: FileText,        href: '/reports',   requiredPermission: 'manage_hr' },
  { nameKey: 'settings',  icon: Settings,         href: '/settings',  requiredPermission: 'manage_settings' },
  { nameKey: 'audit_logs',icon: FileText,         href: '/settings/audit-logs', requiredPermission: 'view_audit_logs', module: 'audit' },
  { nameKey: 'api_keys',  icon: GitMerge,         href: '/settings/api-keys', requiredPermission: 'manage_settings', module: 'core' },
  { nameKey: 'branding',  icon: Palette,         href: '/settings/branding', requiredPermission: 'manage_settings', module: 'core' },
];

export function Sidebar() {
  const t = useTranslations('Navigation');
  const tCommon = useTranslations('Common');
  const { enabledModules, planType } = useTenant();

  const filteredItems = menuItems.filter(item => {
    if (planType === 'ENTERPRISE') return true;
    if (!item.module) return true;
    return enabledModules?.includes(item.module);
  });
  const { logo, tenantName } = useTenant();
  const { user, loading, logout } = useAuth();
  const { hasPermission } = usePermission();
  const pathname = usePathname();

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 glass-nav border-r border-white/10 transition-transform backdrop-blur-[20px] shadow-2xl">
      <div className="flex flex-col h-full bg-background/20">
        {/* Logo Section */}
        <div className="p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <Link href="/" className="flex items-center gap-4 overflow-hidden relative z-10 hover:opacity-80 transition-opacity">
            {logo ? (
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-black/10 overflow-hidden border border-white/20">
                <img 
                  src={logo.startsWith('http') ? logo : `${getBaseUrl().replace('/api', '')}${logo}`} 
                  alt={`${tenantName} Logo`} 
                  className="h-full w-full object-contain p-1.5" 
                />
              </div>
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
                HK
              </div>
            )}
            <div className="overflow-hidden">
              <h1 className="text-xl font-black tracking-tighter truncate">
                {tenantName === 'Public' ? 'HariKerja' : tenantName}
              </h1>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block truncate opacity-60">
                {tenantName === 'Public' ? 'Public Portal' : 'Workspace'}
              </span>
            </div>
          </Link>
          <div className="mt-8">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto no-scrollbar">
          {filteredItems.filter(item => {
            if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
              return false;
            }
            return true;
          }).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden border border-transparent",
                  isActive 
                    ? "text-primary bg-primary/10 font-bold border-primary/10 shadow-sm" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover:border-white/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-glow"
                    className="absolute inset-0 bg-primary/5 -z-10"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("transition-all group-hover:scale-110 group-hover:rotate-3", isActive ? "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "")} size={20} />
                <span className="flex-1 text-sm tracking-tight">{t(item.nameKey)}</span>
                <ChevronRight className={cn("ml-auto opacity-0 transition-all", isActive ? "opacity-60 translate-x-0" : "group-hover:translate-x-1 group-hover:opacity-40")} size={14} />
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-6 mt-auto">
          <div className="glass-card rounded-[1.5rem] p-4 border border-white/10 flex items-center gap-4 overflow-hidden shadow-inner group/user cursor-pointer hover:bg-white/5 transition-all">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-accent font-black text-sm border border-accent/10 shadow-lg">
              {loading ? '...' : getInitials(user?.fullname || user?.email || 'Admin')}
            </div>
            <div className="overflow-hidden flex-1">
              <p data-testid="sidebar-fullname" className="text-sm font-bold truncate group-hover/user:text-accent transition-colors">
                {loading ? tCommon('loading') : (user?.fullname || 'Admin User')}
              </p>
              <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-tight opacity-60">
                {user?.email || 'admin@hrms.com'}
              </p>
            </div>
            <button 
              onClick={logout}
              className="p-2 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 hover:scale-110 active:scale-95 transition-all shrink-0" 
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
