'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  LayoutDashboard, 
  Settings, 
  ChevronRight,
  Briefcase,
  BarChart2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';

const menuItems = [
  { name: 'Overview',   icon: LayoutDashboard, href: '/' },
  { name: 'Employees', icon: Users,            href: '/employees' },
  { name: 'Attendance',icon: Calendar,         href: '/attendance' },
  { name: 'Payroll',   icon: CreditCard,       href: '/payroll' },
  { name: 'Analytics', icon: BarChart2,        href: '/analytics' },
  { name: 'Settings',  icon: Settings,         href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tenantName } = useTenant();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 glass-card border-r transition-transform">
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Briefcase size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">HRMS</h1>
              <span className="text-xs font-medium text-muted-foreground opacity-70">
                {tenantName} Portal
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {menuItems.map((item) => {
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
                <span className="flex-1">{item.name}</span>
                <ChevronRight className={cn("ml-auto opacity-0 transition-all", isActive ? "opacity-40" : "group-hover:translate-x-1 group-hover:opacity-40")} size={14} />
              </Link>
            );
          })}
        </nav>

        {/* User Profile Hook (Placeholder) */}
        <div className="p-4 mt-auto">
          <div className="glass-card rounded-2xl p-4 border flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">admin@hrms.com</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
