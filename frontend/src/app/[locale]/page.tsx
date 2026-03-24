'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/shared/Skeleton';

const AttendanceChart = dynamic(() => import('@/components/dashboard/AttendanceChart'), {
  loading: () => <Skeleton className="w-full h-64" />,
  ssr: false
});

const stats = [
  { 
    nameKey: 'total_employees', 
    value: '1,284', 
    change: '+12%', 
    trend: 'up', 
    icon: Users,
    color: 'bg-blue-500/10 text-blue-500'
  },
  { 
    nameKey: 'today_attendance', 
    value: '954', 
    change: '92%', 
    trend: 'up', 
    icon: UserCheck,
    color: 'bg-emerald-500/10 text-emerald-500'
  },
  { 
    nameKey: 'pending_leaves', 
    value: '12', 
    change: '-2', 
    trend: 'down', 
    icon: Clock,
    color: 'bg-orange-500/10 text-orange-500'
  },
  { 
    nameKey: 'new_hires', 
    value: '24', 
    change: '+3', 
    trend: 'up', 
    icon: UserPlus,
    color: 'bg-purple-500/10 text-purple-500'
  },
];

export default function Home() {
  const t = useTranslations('Dashboard');
  const tNav = useTranslations('Navigation');
  const tCommon = useTranslations('Common');
  const { user, loading } = useAuth();
  const { isPublic } = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && isPublic) {
      router.push('/signup');
    }
  }, [user, loading, isPublic, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-[400px] rounded-3xl" />
            <Skeleton className="h-[400px] rounded-3xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If not logged in and on public, we'll be redirecting, so show nothing
  if (!user && isPublic) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            {loading ? tCommon('loading') : `${t('welcome')}, ${user?.fullname || 'Admin'} 👋`}
          </motion.h1>
          <p className="text-muted-foreground">
            {loading ? t('fetching') : t('subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.nameKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 rounded-3xl border shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl", stat.color)}>
                  <stat.icon size={24} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                  stat.trend === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t(`stats.${stat.nameKey}`)}</p>
                <p className="text-4xl font-bold tracking-tighter group-hover:scale-105 transition-transform origin-left">
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Cards / Recent Activity Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 glass-card rounded-3xl p-8 min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Attendance Trends</h2>
              <div className="flex gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">REALTIME</span>
              </div>
            </div>
            
            {/* Real Chart */}
            <div className="w-full h-72">
              <AttendanceChart />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="glass-card rounded-3xl p-8 flex flex-col gap-6"
          >
            <h2 className="text-xl font-bold">Recent Hires</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Employee {i}</p>
                    <p className="text-xs text-muted-foreground">Joined 2 days ago</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
