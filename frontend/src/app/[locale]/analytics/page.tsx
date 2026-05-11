'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  TrendingUp, 
  Users, 
  UserCheck,
  CreditCard, 
  Clock, 
  Download,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { apiFetch, getBaseUrl } from '@/lib/api';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

interface DashboardStats {
  total_employees: number;
  attendance_percent: number;
  attendance_today: { status: string; count: number }[];
  department_distribution: { name: string; employee_count: number }[];
  payroll_summary: {
    total_net_pay: number;
    total_overtime: number;
  };
  trends: {
    months: string[];
    headcount: number[];
  };
}

export default function AnalyticsPage() {
  const t = useTranslations('Analytics');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFetching = useRef(false);
  const { user, loading: authLoading } = useAuth();

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    try {
      isFetching.current = true;
      setIsLoading(true);
      
      // Additional safety check: only fetch if user likely has permissions
      // though Analytics page should already be restricted via Sidebar/Middleware.
      const data = await apiFetch('/core/dashboard-stats/');
      setStats(data);
    } catch (error: any) {
      // If we still get a 403, handle it gracefully
      if (error.message?.includes('403')) {
        console.warn('[Analytics] Access restricted for current user');
      } else {
        console.error('[Analytics] Failed to fetch stats:', error);
        toast.error('Failed to load dashboard metrics');
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchData();
      } else {
        setIsLoading(false);
      }
    }
  }, [fetchData, authLoading, user]);

  const handleExport = async (type: 'attendance' | 'performance' | 'payroll' | 'reimbursement') => {
    const { apiDownload } = await import('@/lib/api');
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    
    if (type === 'attendance') {
      await apiDownload(`/attendance/attendance/export_csv/?month=${month}&year=${year}`, `Attendance_Recap_${month}_${year}.csv`);
    } else if (type === 'performance') {
      await apiDownload('/appraisals/export_csv/', 'Performance_Recap.csv');
    } else if (type === 'payroll') {
      await apiDownload(`/payslips/export_recap_csv/?month=${month}&year=${year}`, `Payroll_Recap_${month}_${year}.csv`);
    } else if (type === 'reimbursement') {
      await apiDownload('/reimbursements/export_csv/', 'Reimbursement_Recap.csv');
    }
  };

  const fmt = (n: number) => `Rp ${new Intl.NumberFormat('en-US').format(n)}`;

  const kpis = [
    { key: 'totalPayroll', label: t('totalPayroll'), value: fmt(stats?.payroll_summary.total_net_pay || 0), icon: CreditCard, color: '#3B82F6' },
    { key: 'totalHeadcount', label: t('totalHeadcount'), value: `${stats?.total_employees || 0}`, icon: Users, color: '#10B981' },
    { key: 'attendanceRate', label: 'Attendance Rate', value: `${stats?.attendance_percent || 0}%`, icon: UserCheck, color: '#10B981' },
    { key: 'overtimeCost', label: t('overtimeCost'), value: fmt(stats?.payroll_summary.total_overtime || 0), icon: Clock, color: '#F59E0B' },
    { key: 'costPerEmployee', label: t('costPerEmployee'), value: fmt((stats?.payroll_summary.total_net_pay || 0) / (stats?.total_employees || 1)), icon: TrendingUp, color: '#a3b18a' },
  ];

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 animate-pulse">
            {t('loading')}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">{t('title')}</h1>
              <p className="text-gray-400 font-medium max-w-2xl">{t('subtitle')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => handleExport('attendance')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <Download size={14} className="text-primary" />
                {t('exportAttendance')}
              </button>
              <button 
                onClick={() => handleExport('payroll')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <Download size={14} className="text-emerald-500" />
                {t('exportPayroll')}
              </button>
              <button 
                onClick={() => handleExport('reimbursement')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <Download size={14} className="text-amber-500" />
                {t('exportExpense')}
              </button>
              <button 
                onClick={() => handleExport('performance')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                <Download size={14} />
                {t('exportPerformance')}
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k) => (
              <div key={k.key} data-testid={`kpi-${k.key}`} className="glass-card p-6 rounded-[2rem] border border-white/10 bg-white/5 relative overflow-hidden group">
                <div 
                  className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 transition-opacity group-hover:opacity-40"
                  style={{ background: k.color }}
                />
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 group-hover:text-white group-hover:bg-white/10 transition-all">
                    <k.icon size={20} />
                  </div>
                </div>
                <p data-testid={`kpi-${k.key}-label`} className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{k.label}</p>
                <p data-testid={`kpi-${k.key}-value`} className="text-3xl font-black text-white">{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Trend Chart (Headcount) */}
            <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('headcountSection')}</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] text-primary font-bold uppercase">
                  <TrendingUp size={12} />
                  +12% Growth
                </div>
              </div>
              
              <div className="flex items-end gap-4 h-64 px-4">
                {stats?.trends.months.map((m, i) => (
                  <div key={m} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full">
                      <div 
                        className="w-full rounded-2xl bg-gradient-to-t from-primary/20 to-primary transition-all duration-1000 group-hover:scale-x-105"
                        style={{ height: `${(stats.trends.headcount[i] / Math.max(...stats.trends.headcount)) * 200}px` }}
                      />
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="px-3 py-1 bg-white rounded-lg text-primary font-bold text-xs shadow-xl">
                          {stats.trends.headcount[i]}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dept Breakdown */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/5 space-y-8">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Staff Distribution</h2>
              <div className="space-y-6">
                {stats?.department_distribution.map((d) => (
                  <div key={d.name} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-gray-400">{d.name}</span>
                      <span className="text-white" data-testid="dept-staff-count">{d.employee_count} staff</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden border border-white/5 p-0.5">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-1000"
                        style={{ width: `${(d.employee_count / stats.total_employees) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/10">
                <div className="flex items-start gap-4 p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                  <AlertCircle className="text-blue-500 shrink-0" size={20} />
                  <p className="text-[11px] text-gray-400 leading-relaxed italic">
                    "Engineering remains our largest cost center, followed closely by Sales initiatives this quarter."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
