'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  BarChart3, 
  FileText, 
  Download, 
  ChevronRight, 
  Calendar,
  Clock,
  CreditCard,
  UserCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api';
import { toast } from 'sonner';

interface ReportStats {
  attendance: { total: number; present: number; late: number; rate: number };
  payroll: { total_disbursed: number; pending: number; count: number };
  reimbursement: { total_claimed: number; approved: number; count: number };
  performance: { total_appraisals: number; completed: number; avg_score: number };
}

export default function ReportsPage() {
  const t = useTranslations('Reports');
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // We'll create a new backend endpoint for this summary later
        // For now, let's try to aggregate from existing ones or use a mock
        const data = await apiFetch('/core/dashboard-stats/');
        // Mapping from dashboard stats to our reporting stats
        setStats({
          attendance: { 
            total: 100, 
            present: Math.round(data.attendance_percent), 
            late: 100 - Math.round(data.attendance_percent),
            rate: data.attendance_percent
          },
          payroll: { 
            total_disbursed: data.payroll_summary.total_net_pay, 
            pending: 0,
            count: data.total_employees
          },
          reimbursement: { 
            total_claimed: data.payroll_summary.total_overtime * 1.5, // Mock
            approved: 85,
            count: 12
          },
          performance: { 
            total_appraisals: 25, 
            completed: 20,
            avg_score: 4.2
          }
        });
      } catch (err) {
        toast.error('Failed to load report summaries');
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  const reportCards = [
    {
      title: 'Attendance Report',
      icon: UserCheck,
      color: 'blue',
      stats: stats ? `${stats.attendance.rate}% Attendance Rate` : 'Loading...',
      desc: 'Monthly attendance recap, late logs, and absence summaries.',
      exports: [
        { name: 'XLSX Recap', endpoint: '/attendance/attendance/export_xlsx/', filename: 'Attendance_Report.xlsx' },
        { name: 'PDF Summary', endpoint: '/attendance/attendance/export_summary_pdf/', filename: 'Attendance_Summary.pdf' },
      ]
    },
    {
      title: 'Payroll Recap',
      icon: CreditCard,
      color: 'emerald',
      stats: stats ? `Rp ${stats.payroll.total_disbursed.toLocaleString()} Disbursed` : 'Loading...',
      desc: 'Salary distribution, tax summaries, and period recaps.',
      exports: [
        { name: 'XLSX Recap', endpoint: '/payslips/export_recap_xlsx/', filename: 'Payroll_Recap.xlsx' },
        { name: 'CSV Recap', endpoint: '/payslips/export_recap_csv/', filename: 'Payroll_Recap.csv' },
      ]
    },
    {
      title: 'Reimbursements',
      icon: Clock,
      color: 'amber',
      stats: stats ? `${stats.reimbursement.count} Claims processed` : 'Loading...',
      desc: 'Expense tracking, category distribution, and approval logs.',
      exports: [
        { name: 'XLSX Recap', endpoint: '/reimbursements/export_xlsx/', filename: 'Expense_Report.xlsx' },
        { name: 'CSV Recap', endpoint: '/reimbursements/export_csv/', filename: 'Expense_Report.csv' },
      ]
    },
    {
      title: 'Performance Analysis',
      icon: TrendingUp,
      color: 'purple',
      stats: stats ? `${stats.performance.avg_score}/5.0 Avg Score` : 'Loading...',
      desc: 'Appraisal completion rates and KPI performance recaps.',
      exports: [
        { name: 'XLSX Recap', endpoint: '/appraisals/export_xlsx/', filename: 'Performance_Report.xlsx' },
        { name: 'CSV Recap', endpoint: '/appraisals/export_csv/', filename: 'Performance_Report.csv' },
      ]
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <header className="space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
            <BarChart3 className="text-primary" size={32} />
            Reporting Center
          </h1>
          <p className="text-gray-400 font-medium">Access and export comprehensive business reports for web or mobile review.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportCards.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl bg-${card.color}-500/10 text-${card.color}-500 border border-${card.color}-500/20`}>
                  <card.icon size={24} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Module Metric</p>
                  <p className="text-xl font-bold text-white">{card.stats}</p>
                </div>
              </div>

              <h3 className="text-xl font-black text-white mb-2">{card.title}</h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">{card.desc}</p>

              <div className="flex flex-wrap gap-2">
                {card.exports.map(exp => (
                  <button
                    key={exp.name}
                    onClick={() => apiDownload(exp.endpoint, exp.filename)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-primary hover:border-primary transition-all"
                  >
                    <Download size={14} />
                    {exp.name}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <section className="glass-card p-8 rounded-[2.5rem] border border-white/10 bg-white/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calendar size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase italic">Scheduled Recaps</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Mobile Optimized View</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Quarterly Performance Review', date: 'April 2026', status: 'READY' },
              { label: 'Annual Tax Summary (PPH 21)', date: 'FY 2025', status: 'READY' },
              { label: 'Branch Attendance Trends', date: 'Q1 2026', status: 'READY' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{item.date}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
