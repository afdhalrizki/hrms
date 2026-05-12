'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight
} from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { Skeleton } from '@/components/shared/Skeleton';
import { apiFetch } from '@/lib/api';

import StatCard from '@/components/dashboard/StatCard';
import QuotaUsageCard from '@/components/dashboard/QuotaUsageCard';
import { PublicNav } from '@/components/layout/PublicNav';
import { PublicFooter } from '@/components/layout/PublicFooter';

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
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isTest = process.env.NEXT_PUBLIC_E2E_TESTING === 'true';
    const isPublicDomain = isPublic || isLocal || isTest;

    // Only redirect to login if we are on a private tenant (subdomain) 
    // where the root page is NOT public.
    if (!authLoading && !user && !isPublicDomain) {
      router.push('/login');
    }
  }, [user, authLoading, isPublic, router]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchStats = async () => {
      try {
        const data = await apiFetch('/core/dashboard-stats/', { signal: controller.signal });
        setStatsData(data);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch stats', err);
      } finally {
        setStatsLoading(false);
      }
    };

    const canViewStats = user?.is_staff || user?.permissions?.manage_hr;
    if (user && canViewStats) {
      fetchStats();
    } else if (user) {
      setStatsLoading(false);
    }

    return () => controller.abort();
  }, [user]);

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isTest = process.env.NEXT_PUBLIC_E2E_TESTING === 'true';
  const isPublicDomain = isPublic || isLocal || isTest;

  // 1. If we are on a public domain and NOT logged in, show Landing Page immediately
  if (!user && isPublicDomain) {
    return (
      <div className="flex flex-col min-h-screen">
        <PublicNav />
        
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-50" />
          <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] opacity-40" />
          
          <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Sesuai TER 2024 & BPJS
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1]">
                Kelola SDM Jadi Lebih <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Simpel & Akurat</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-medium">
                Sistem HRMS all-in-one untuk bisnis Indonesia. Dari absensi geolokasi hingga 
                otomatisasi penggajian yang patuh pajak.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a href="/signup" className="w-full sm:w-auto px-10 py-5 bg-primary text-white rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-2">
                Mulai Sekarang (Gratis) <ArrowRight size={20} />
              </a>
              <a href="/pricelist" className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center">
                Lihat Paket Harga
              </a>
            </motion.div>

            {/* Dashboard Mockup Placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative mt-20 p-4 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" 
                alt="Dashboard Preview" 
                className="rounded-[2rem] w-full shadow-2xl grayscale-[0.5] hover:grayscale-0 transition-all duration-700"
              />
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-32 bg-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Fitur Utama HariKerja</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Solusi lengkap yang dirancang khusus untuk memenuhi kebutuhan operasional dan kepatuhan bisnis di Indonesia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { 
                  icon: <Clock className="text-primary" />, 
                  title: "Absensi & Kehadiran", 
                  desc: "Pelacakan waktu nyata dengan geofencing GPS dan verifikasi foto untuk mencegah kecurangan." 
                },
                { 
                  icon: <Users className="text-accent" />, 
                  title: "Manajemen Karyawan", 
                  desc: "Database pusat untuk semua data karyawan, dokumen (KTP/NPWP), dan struktur organisasi." 
                },
                { 
                  icon: <TrendingUp className="text-emerald-500" />, 
                  title: "Otomatisasi Payroll", 
                  desc: "Perhitungan gaji otomatis yang sudah terintegrasi dengan PPh 21 (TER 2024) dan iuran BPJS." 
                },
                { 
                  icon: <UserCheck className="text-orange-500" />, 
                  title: "Cuti & Perizinan", 
                  desc: "Alur kerja persetujuan cuti bertingkat yang transparan dan mudah dipantau oleh admin." 
                },
                { 
                  icon: <ArrowUpRight className="text-accent" />, 
                  title: "Reimbursement", 
                  desc: "Pengajuan klaim biaya operasional dengan upload kuitansi langsung dari aplikasi mobile." 
                },
                { 
                  icon: <TrendingUp className="text-blue-500" />, 
                  title: "Manajemen Kinerja", 
                  desc: "Pantau produktivitas tim dengan pelacakan KPI dan sistem penilaian mandiri (Self-Appraisal)." 
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -10 }}
                  className="p-10 rounded-[2.5rem] bg-background border border-glass-border hover:border-primary/50 transition-all group"
                >
                  <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-center gap-12 md:gap-32">
              {[
                { label: "Akurasi Payroll", value: "99.9%" },
                { label: "Dukungan", value: "24/7" }
              ].map((stat, i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="text-4xl md:text-5xl font-black text-primary tracking-tighter">{stat.value}</div>
                  <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="relative p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-primary to-accent overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-20 -mb-20" />
              
              <div className="relative z-10 text-center text-white space-y-8">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Siap Modernisasi HR Anda?</h2>
                <p className="text-xl text-white/80 max-w-2xl mx-auto font-medium">
                  Bergabunglah dengan ratusan perusahaan lainnya yang telah menyederhanakan proses HR mereka.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a href="/signup" className="w-full sm:w-auto px-10 py-5 bg-white text-primary rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl">
                    Daftar Sekarang
                  </a>
                  <a href="/about" className="w-full sm:w-auto px-10 py-5 bg-transparent border border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
                    Pelajari Lebih Lanjut
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    );
  }

  // 2. If auth is still loading, show a simple spinner (not DashboardLayout)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 3. If authenticated or private tenant (redirect will be handled by DashboardLayout or useEffect above)
  if (user && statsLoading) {
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
      color: 'bg-accent/10 text-accent'
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-10 relative">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -z-10 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] opacity-30 pointer-events-none" />

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
