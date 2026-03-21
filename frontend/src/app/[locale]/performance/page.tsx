'use client';

import React, { useState, useEffect } from 'react';
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
  Loader2,
  Star,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AppraisalReviewModal } from '@/components/performance/AppraisalReviewModal';
import { cn } from '@/lib/utils';

interface KPI {
  id: number;
  name: string;
}

interface KPITarget {
  id: number;
  kpi_name: string;
  target_value: number;
  actual_value: number;
  period: string;
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
  
  const [targets, setTargets] = useState<KPITarget[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<number | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const [tData, aData] = await Promise.all([
        apiFetch('/performance/kpi-targets/'),
        apiFetch('/performance/appraisals/')
      ]);
      setTargets(tData || []);
      setAppraisals(aData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'REVIEWED': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'SUBMITTED': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const calculateAverageScore = (reviews: AppraisalReview[]) => {
    if (reviews.length === 0) return null;
    let total = 0;
    let count = 0;
    reviews.forEach(r => {
      Object.values(r.ratings).forEach(score => {
        total += score;
        count++;
      });
    });
    return (total / count).toFixed(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <TrendingUp className="text-primary" size={32} />
              {t('title')}
            </h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl hover:scale-105 transition-all font-bold shadow-lg shadow-primary/30">
            <Plus size={20} />
            {t('modal.submitReview')}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6 glass-card rounded-[40px] border border-white/10">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin" />
            </div>
            <p className="text-muted-foreground animate-pulse font-mono uppercase tracking-[0.2em] text-[10px] font-bold">Synchronizing Growth Metrics</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* KPI Section */}
              <div className="xl:col-span-2 space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <Target size={22} className="text-primary" />
                    {t('kpiSection')}
                  </h2>
                  <BarChart3 size={18} className="text-gray-600" />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {targets.map((target) => {
                    const percentage = Math.min(100, Math.round((target.actual_value / target.target_value) * 100));
                    return (
                      <motion.div 
                        key={target.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card rounded-[32px] p-6 border border-white/5 hover:border-primary/30 hover:bg-white/[0.03] transition-all group overflow-hidden relative"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <TrendingUp size={80} />
                        </div>
                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <Star size={24} fill="currentColor" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-white tracking-tight">{target.kpi_name}</h3>
                              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{target.period}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-black text-white">{percentage}%</span>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">{t('attainment')}</p>
                          </div>
                        </div>
                        
                        <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1.5, ease: 'circOut' }}
                            className={cn(
                              "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                              percentage >= 100 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-primary shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                            )}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5 font-mono">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {target.actual_value} / {target.target_value}
                          </span>
                          <span className={cn(percentage >= 100 ? 'text-emerald-500' : '')}>
                            {percentage >= 100 ? 'Target Surpassed' : 'In Progress'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="space-y-6">
                 <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2 px-4">
                    <Award size={22} className="text-primary" />
                    {t('overallScore')}
                  </h2>
                  <div className="glass-card rounded-[48px] p-10 border border-white/10 text-center flex flex-col items-center bg-gradient-to-br from-primary/10 via-white/[0.02] to-transparent shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 opacity-5 group-hover:scale-125 transition-transform duration-700">
                       <Award size={240} />
                    </div>
                    <div className="h-44 w-44 rounded-full border-4 border-white/5 flex items-center justify-center relative mb-8">
                       <div className="absolute inset-[3px] rounded-full border-[10px] border-primary/20" />
                       <div className="absolute inset-[3px] rounded-full border-t-[10px] border-primary animate-spin-slow" />
                       <span className="text-8xl font-black text-white tracking-tighter drop-shadow-2xl">A</span>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Executive Grade</h3>
                    <p className="text-sm text-gray-400 mt-4 px-6 leading-relaxed">
                      Maintained consistent excellence across all quarterly targets. Recommended for Promotion Track.
                    </p>
                    <div className="w-full h-px bg-white/5 my-8" />
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="text-center p-5 rounded-[24px] bg-white/[0.03] border border-white/5 group-hover:border-primary/20 transition-all">
                        <p className="text-3xl font-black text-white">12</p>
                        <p className="text-[10px] uppercase text-gray-500 font-black tracking-widest">Endorsements</p>
                      </div>
                      <div className="text-center p-5 rounded-[24px] bg-white/[0.03] border border-white/5 group-hover:border-primary/20 transition-all">
                        <p className="text-3xl font-black text-white">98%</p>
                        <p className="text-[10px] uppercase text-gray-500 font-black tracking-widest">Consistency</p>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Appraisals History */}
            <div className="space-y-6 pt-4">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2 px-4">
                <FileText size={22} className="text-primary" />
                {t('appraisalHistory')}
              </h2>
              <div className="glass-card rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('appraisalHistory')}</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Reviews</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Avg Score</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">{tCommon('submit')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {appraisals.map((appraisal) => {
                        const score = calculateAverageScore(appraisal.reviews);
                        return (
                          <tr key={appraisal.id} className="hover:bg-white/[0.04] transition-all group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500">
                                  <Clock size={18} />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-white">{appraisal.period_name}</p>
                                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">{appraisal.start_date} - {appraisal.end_date}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-[0.15em]",
                                getStatusColor(appraisal.status)
                              )}>
                                {appraisal.status}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex justify-center -space-x-2">
                                {appraisal.reviews.map((r, i) => (
                                  <div key={r.id} className="h-8 w-8 rounded-full border-2 border-[#0f172a] bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white title={r.reviewer_name}">
                                    {r.reviewer_type === 'SELF' ? 'S' : 'M'}
                                  </div>
                                ))}
                                {appraisal.reviews.length === 0 && <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">No Reviews</span>}
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="font-mono text-xl font-black text-white">{score || '—'}</span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => setSelectedAppraisalId(appraisal.id)}
                                className="px-5 py-2.5 rounded-xl bg-white/5 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-primary hover:text-white transition-all transform hover:scale-105 shadow-xl hover:shadow-primary/20"
                              >
                                {t('modal.submitReview').split(' ')[1] || 'Start'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
    </DashboardLayout>
  );
}
