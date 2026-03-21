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
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { getBaseUrl } from '@/lib/api';
import { LanguageSwitcher } from './LanguageSwitcher';

const menuItems = [
  { nameKey: 'overview',   icon: LayoutDashboard, href: '/' },
  { nameKey: 'employees', icon: Users,            href: '/employees', isAdminOnly: true },
  { nameKey: 'performance', icon: TrendingUp,     href: '/performance' },
  { nameKey: 'branches',  icon: MapPin,           href: '/branches',  isAdminOnly: true },
  { nameKey: 'attendance',icon: Calendar,         href: '/attendance' },
  { nameKey: 'leaves',    icon: Briefcase,        href: '/leaves' },
  { nameKey: 'reimbursements', icon: Receipt,      href: '/reimbursements' },
  { nameKey: 'payroll',   icon: CreditCard,       href: '/payroll',   isAdminOnly: true },
  { nameKey: 'workflows', icon: GitMerge,         href: '/workflows', isAdminOnly: true },
  { nameKey: 'analytics', icon: BarChart2,        href: '/analytics', isAdminOnly: true },
  { nameKey: 'settings',  icon: Settings,         href: '/settings',  isAdminOnly: true },
  { nameKey: 'audit_logs',icon: FileText,         href: '/settings/audit-logs', isAdminOnly: true },
  { nameKey: 'api_keys',  icon: GitMerge,         href: '/settings/api-keys', isAdminOnly: true },
];

export function Sidebar() {
  const t = useTranslations('Navigation');
  const tCommon = useTranslations('Common');
  const pathname = usePathname();
  const { tenantName, logo } = useTenant();
  const { user, loading } = useAuth();

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 glass-card border-r transition-transform">
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-6">
          <div className="flex items-center gap-3 overflow-hidden">
            {logo ? (
              <div className="h-10 w-10 shrink-0 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-black/5 overflow-hidden">
                <img 
                  src={logo.startsWith('http') ? logo : `${getBaseUrl().replace('/api', '')}${logo}`} 
                  alt={`${tenantName} Logo`} 
                  className="h-full w-full object-contain p-1" 
                />
              </div>
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Briefcase size={22} />
              </div>
            )}
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold tracking-tight truncate">
                {tenantName === 'Public' ? 'harikerja' : tenantName}
              </h1>
              <span className="text-xs font-medium text-muted-foreground opacity-70 block truncate">
                {tenantName === 'Public' ? 'Public Portal' : 'Workspace Portal'}
              </span>
            </div>
          </div>
          <div className="mt-6">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {menuItems.filter(item => {
            if (item.isAdminOnly && !user?.is_staff && !user?.is_global_admin) {
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
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden",
                  isActive 
                    ? "text-primary bg-primary/10 font-medium" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("transition-transform group-hover:scale-110", isActive ? "text-primary" : "")} size={20} />
                <span className="flex-1">{t(item.nameKey)}</span>
                <ChevronRight className={cn("ml-auto opacity-0 transition-all", isActive ? "opacity-40" : "group-hover:translate-x-1 group-hover:opacity-40")} size={14} />
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 mt-auto">
          <div className="glass-card rounded-2xl p-4 border flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 shrink-0 rounded-full bg-accent flex items-center justify-center text-white font-bold">
              {loading ? '...' : getInitials(user?.fullname || user?.email || 'Admin')}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">
                {loading ? tCommon('loading') : (user?.fullname || 'Admin User')}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || 'admin@hrms.com'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
