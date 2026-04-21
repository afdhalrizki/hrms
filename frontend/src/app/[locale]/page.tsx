'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Skeleton } from '@/components/shared/Skeleton';
import { apiFetch } from '@/lib/api';

import StatCard from '@/components/dashboard/StatCard';
import QuotaUsageCard from '@/components/dashboard/QuotaUsageCard';

const AttendanceChart = dynamic(() => import('@/components/dashboard/AttendanceChart'), {
  loading: () => <Skeleton className="w-full h-64" />,
  ssr: false
});

export default function Home() {
  const t = useTranslations('Dashboard');
  const tNav = useTranslations('Navigation');
  const tCommon = useTranslations('Common');
  const { user, loading: authLoading } = useAuth();
  const { isPublic } = useTenant();
  const router = useRouter();

  const [statsData, setStatsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user && isPublic) {
      router.push('/signup');
    }
  }, [user, authLoading, isPublic, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiFetch('/core/dashboard-stats/');
        setStatsData(data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setStatsLoading(false);
      }
    };
    if (user) fetchStats();
  }, [user]);

  if (authLoading || statsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-10">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full rounded-[2rem]" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-[450px] rounded-[2.5rem]" />
            <div className="space-y-6">
              <Skeleton className="h-[200px] rounded-[2.5rem]" />
              <Skeleton className="h-[224px] rounded-[2.5rem]" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const statItems = [
    { 
      nameKey: 'total_employees', 
      value: statsData?.total_employees || 0, 
      change: '+0%', 
      trend: 'up' as const, 
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500'
    },
    { 
      nameKey: 'today_attendance', 
      value: statsData?.attendance_today?.present || 0, 
      change: `${statsData?.attendance_percent || 0}%`, 
      trend: 'up' as const, 
      icon: UserCheck,
      color: 'bg-emerald-500/10 text-emerald-500'
    },
    { 
      nameKey: 'pending_leaves', 
      value: statsData?.pending_leaves || 0, 
      change: '0', 
      trend: 'down' as const, 
      icon: Clock,
      color: 'bg-orange-500/10 text-orange-500'
    },
    { 
      nameKey: 'new_hires', 
      value: statsData?.new_hires || 0, 
      change: '+0', 
      trend: 'up' as const, 
      icon: UserPlus,
      color: 'bg-purple-500/10 text-purple-500'
    },
  ];

  // If not logged in and on public, we'll be redirecting, so show nothing
  if (!user && isPublic) return null;

  return (
    <DashboardLayout>
      <div className="space-y-10 relative">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -z-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] opacity-30 pointer-events-none" />

        {/* Header Section */}
        <div className="flex flex-col gap-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="h-1 w-8 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Overview Dashboard</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tighter"
          >
            {authLoading ? tCommon('loading') : `${t('welcome')}, ${user?.fullname || 'Admin'} 👋`}
          </motion.h1>
          <p className="text-muted-foreground max-w-2xl text-lg font-medium">
            {authLoading ? t('fetching') : t('subtitle')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((stat, index) => (
            <StatCard
              key={stat.nameKey}
              index={index}
              name={t(`stats.${stat.nameKey}`)}
              value={stat.value}
              change={stat.change}
              trend={stat.trend}
              icon={stat.icon}
              color={stat.color}
            />
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
              <AttendanceChart data={statsData?.trends?.attendance} />
            </div>
          </motion.div>
          
          <div className="flex flex-col gap-6">
            <QuotaUsageCard />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="glass-card rounded-3xl p-8 flex flex-col gap-8 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
              <h2 className="text-xl font-bold flex items-center gap-2 relative z-10">
                <TrendingUp size={20} className="text-accent" />
                Recent Hires
              </h2>
              <div className="space-y-4 relative z-10">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer border border-white/5 hover:border-white/10 group/item">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center font-black text-accent text-lg shadow-inner group-hover/item:scale-110 transition-transform">
                      {String.fromCharCode(64 + i)}
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-bold group-hover/item:text-accent transition-colors">Employee {i}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Joined 2 days ago</p>
                    </div>
                    <ArrowUpRight size={14} className="text-muted-foreground opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
