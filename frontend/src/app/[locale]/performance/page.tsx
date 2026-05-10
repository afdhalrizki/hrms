'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { 
  TrendingUp, 
  Target, 
  Award, 
  BarChart3, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FileText,
  AlertCircle,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { FeatureGuard } from '@/components/shared/FeatureGuard';
import { Skeleton } from '@/components/shared/Skeleton';
import { toast } from 'sonner';
import { AppraisalReviewModal } from '@/components/performance/AppraisalReviewModal';
import { useAuth } from '@/context/AuthContext';

interface KPITarget {
  id: number;
  kpi_name: string;
  target_value: string;
  current_value: string;
  unit: string;
  weight: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK';
}

interface AppraisalReview {
  id: number;
  reviewer_type: 'SELF' | 'MANAGER' | 'PEER';
  reviewer_name: string;
  ratings: Record<string, number>;
  comments: string;
}

interface Appraisal {
  id: number;
  employee_name: string;
  period_name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'COMPLETED';
  start_date: string;
  end_date: string;
  reviews: AppraisalReview[];
}

export default function PerformancePage() {
  const t = useTranslations('Performance');
  const tCommon = useTranslations('Common');
  const { enabledModules } = useTenant();
  
  const [targets, setTargets] = useState<KPITarget[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<number | null>(null);
  const { user, loading: authLoading } = useAuth();

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);
      const [tData, aData] = await Promise.all([
        apiFetch('/kpi-targets'),
        apiFetch('/appraisals')
      ]);
      setTargets(tData || []);
      setAppraisals(aData || []);
    } catch (err) {
      console.error('Failed to fetch performance data', err);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchPerformanceData();
    }
  }, [fetchPerformanceData, authLoading, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'REVIEWED': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'SUBMITTED': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const calculateAverageScore = (reviews: AppraisalReview[]) => {
    if (!reviews || reviews.length === 0) return null;
    const allRatings = reviews.flatMap(r => Object.values(r.ratings || {}));
    if (allRatings.length === 0) return null;
    return (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1);
  };

  if (!enabledModules?.includes('performance')) {
    return null;
  }

  return (
    <DashboardLayout>
      <FeatureGuard module="performance" showInUpgradePrompt>
      <div className="space-y-12 pb-20">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter flex items-center gap-4">
              <TrendingUp className="text-primary h-12 w-12" />
              {t('title')}
            </h1>
            <p className="text-gray-400 font-medium text-lg max-w-2xl">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={async () => {
                const { apiDownload } = await import('@/lib/api');
                apiDownload('/appraisals/export_csv/', 'Performance_Recap.csv');
              }}
              className="px-6 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-2"
            >
              <FileText size={20} />
              Excel Summary
            </button>
            <div className="px-6 py-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Current Period</span>
              <span className="text-white font-black">Q1 2026</span>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-[32px] bg-white/5 border border-white/5" />)}
            </div>
            <div className="space-y-6">
              <Skeleton className="h-8 w-48 mb-6 bg-white/5 border border-white/5" />
              <Skeleton className="h-[500px] w-full rounded-[48px] bg-white/5 border border-white/5" />
            </div>
          </div>
        ) : (
          <>
            {/* KPI Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {targets.length === 0 ? (
                <div className="xl:col-span-3 p-12 text-center glass-card rounded-[32px] border border-white/10">
                  <Target className="mx-auto text-gray-600 mb-4 h-12 w-12 opacity-20" />
                  <p className="text-gray-500 font-bold uppercase tracking-widest">{t('noTargets') || 'No KPI targets found.'}</p>
                </div>
              ) : (
                targets.map((target, idx) => (
                  <motion.div
                    key={target.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group glass-card p-8 rounded-[32px] border border-white/10 hover:border-primary/30 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <BarChart3 size={80} />
                    </div>
                    <div className="flex items-start justify-between mb-8">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Target size={28} />
                      </div>
                      <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusColor(target.status))}>
                        {target.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 group-hover:text-primary transition-colors line-clamp-1">{target.kpi_name}</h3>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Progress</p>
                        <div className="text-3xl font-black text-white tracking-tighter">
                          {parseFloat(target.current_value).toLocaleString()}
                          <span className="text-sm text-gray-500 ml-1">/ {parseFloat(target.target_value).toLocaleString()} {target.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Weight</p>
                        <p className="text-xl font-black text-primary font-mono">{target.weight}%</p>
                      </div>
                    </div>
                    {/* Tiny Progress Bar */}
                    <div className="mt-6 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (parseFloat(target.current_value) / parseFloat(target.target_value)) * 100)}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Appraisal History */}
            <div className="glass-card rounded-[48px] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-10 border-b border-white/10 flex items-center justify-between bg-white/2 space-x-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Award size={20} />
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">{t('appraisalHistory')}</h2>
                </div>
                <div className="hidden md:flex gap-2">
                  <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-gray-400">FILTERS</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.03]">
                      <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('table.period')}</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('table.status')}</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">{t('table.reviews')}</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">{t('table.score')}</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">{t('table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {appraisals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-10 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <FileText size={48} className="text-gray-600" />
                            <p className="text-gray-500 font-bold uppercase tracking-widest">{t('noAppraisals') || 'No appraisal history found.'}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      appraisals.map((appraisal) => {
                        const score = calculateAverageScore(appraisal.reviews || []);
                        return (
                          <tr key={appraisal.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                                  <Clock size={18} />
                                </div>
                                <div>
                                  <p className="text-lg font-black text-white group-hover:text-primary transition-colors tracking-tight">{appraisal.period_name}</p>
                                  <p className="text-xs text-gray-500 font-bold font-mono uppercase">{appraisal.start_date} — {appraisal.end_date}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                              <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 inline-flex items-center gap-2", getStatusColor(appraisal.status))}>
                                <div className="h-1 w-1 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                                {appraisal.status}
                              </span>
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex justify-center -space-x-2">
                                {(appraisal.reviews || []).map((r, i) => (
                                  <div 
                                    key={r.id} 
                                    className="h-8 w-8 rounded-full border-2 border-[#0f172a] bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white ring-2 ring-primary/20"
                                    title={r.reviewer_name}
                                  >
                                    {r.reviewer_type === 'SELF' ? 'S' : 'M'}
                                  </div>
                                ))}
                                {(appraisal.reviews || []).length === 0 && <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">No Reviews</span>}
                              </div>
                            </td>
                            <td className="px-10 py-8 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-mono text-2xl font-black text-white group-hover:scale-125 transition-transform">{score || '—'}</span>
                                {score && <div className="h-1 w-8 bg-primary/30 mt-1 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary w-2/3" />
                                </div>}
                              </div>
                            </td>
                            <td className="px-10 py-8 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={async () => {
                                    const { apiDownload } = await import('@/lib/api');
                                    apiDownload(`/appraisals/${appraisal.id}/download_pdf`, `Appraisal_${appraisal.period_name.replace(' ', '_')}.pdf`);
                                  }}
                                  className="h-10 w-10 rounded-xl bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10 transition-all flex items-center justify-center border border-white/5"
                                  title="Download Report PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => setSelectedAppraisalId(appraisal.id)}
                                  data-testid={`submit-review-btn-${appraisal.id}`}
                                  className="px-6 py-2.5 rounded-xl bg-white/5 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-primary hover:text-white transition-all transform hover:scale-105 shadow-xl hover:shadow-primary/20 flex items-center justify-center gap-2 group/btn"
                                >
                                  {t('modal.submitReview')}
                                  <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedAppraisalId && (
          <AppraisalReviewModal 
            appraisalId={selectedAppraisalId} 
            onClose={() => setSelectedAppraisalId(null)} 
            onSuccess={fetchPerformanceData} 
          />
        )}
      </AnimatePresence>
      </FeatureGuard>
    </DashboardLayout>
  );
}
