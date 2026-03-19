'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { KPI, KPITarget, Appraisal, AppraisalStatus } from '@/types/performance';
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
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function PerformancePage() {
  const [targets, setTargets] = useState<KPITarget[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const [tData, aData] = await Promise.all([
        apiFetch('/kpi-targets/'),
        apiFetch('/appraisals/')
      ]);
      setTargets(tData);
      setAppraisals(aData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: AppraisalStatus) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'REVIEWED': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'SUBMITTED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strategy & Performance</h1>
            <p className="text-muted-foreground mt-1">Track your growth, KPIs, and professional appraisals.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20">
            <Plus size={20} />
            New Appraisal
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-muted-foreground animate-pulse">Syncing performance metrics...</p>
          </div>
        ) : (
          <>
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Target size={22} className="text-primary" />
                    Key Performance Indicators
                  </h2>
                  <BarChart3 size={18} className="text-muted-foreground" />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {targets.map((target) => {
                    const percentage = Math.min(100, Math.round((target.actual_value / target.target_value) * 100));
                    return (
                      <motion.div 
                        key={target.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card rounded-2xl p-5 border hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                              <TrendingUp size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold">{target.kpi_name}</h3>
                              <p className="text-xs text-muted-foreground">{target.period}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black">{percentage}%</span>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Attainment</p>
                          </div>
                        </div>
                        
                        <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`absolute top-0 left-0 h-full rounded-full ${percentage >= 100 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]'}`}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 text-xs font-medium text-muted-foreground">
                          <span>Progress: {target.actual_value} / {target.target_value}</span>
                          <span className={percentage >= 100 ? 'text-green-500' : ''}>Target Reached</span>
                        </div>
                      </motion.div>
                    );
                  })}
                  {targets.length === 0 && (
                    <div className="text-center py-12 glass-card rounded-2xl border border-dashed text-muted-foreground italic">
                      No KPIs assigned for this period.
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="space-y-6">
                 <h2 className="text-xl font-bold flex items-center gap-2">
                    <Award size={22} className="text-primary" />
                    Overall Score
                  </h2>
                  <div className="glass-card rounded-[2.5rem] p-8 border text-center flex flex-col items-center bg-gradient-to-b from-primary/5 to-transparent">
                    <div className="h-32 w-32 rounded-full border-4 border-primary/20 flex items-center justify-center relative mb-4">
                       <span className="text-5xl font-black text-primary">A</span>
                       <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin-slow" />
                    </div>
                    <h3 className="text-lg font-bold">Excellent Rating</h3>
                    <p className="text-sm text-muted-foreground mt-2 px-4">
                      You are in the top 5% of performers this quarter. Keep up the great work!
                    </p>
                    <div className="w-full h-px bg-white/5 my-6" />
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="text-center p-3 rounded-2xl bg-white/5 border">
                        <p className="text-xl font-bold">12</p>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Badges</p>
                      </div>
                      <div className="text-center p-3 rounded-2xl bg-white/5 border">
                        <p className="text-xl font-bold">98%</p>
                        <p className="text-[10px] uppercase text-muted-foreground font-bold">Consistency</p>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Appraisals Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2 font-display">
                <FileText size={22} className="text-primary" />
                Performance Appraisals
              </h2>
              <div className="glass-card rounded-3xl border overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest pl-8">Period</th>
                      <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest">Status</th>
                      <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest text-center">Score</th>
                      <th className="p-4 text-xs font-bold uppercase text-muted-foreground tracking-widest text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appraisals.map((appraisal) => (
                      <tr key={appraisal.id} className="border-t border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="p-4 pl-8">
                          <div className="flex items-center gap-3">
                            <Clock size={16} className="text-muted-foreground" />
                            <span className="font-semibold">{appraisal.period_name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(appraisal.status)}`}>
                            {appraisal.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-mono text-lg font-bold">N/A</span>
                        </td>
                        <td className="p-4 text-right pr-8">
                          <button className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all group-hover:translate-x-1">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {appraisals.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-muted-foreground italic">
                          No appraisal history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
