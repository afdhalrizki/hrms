'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  CreditCard, 
  Download, 
  Eye, 
  Wallet, 
  PieChart, 
  TrendingUp,
  FileText,
  Play,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch, apiDownload } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PayslipDetailModal } from '@/components/payroll/PayslipDetailModal';
import { GeneratePayrollModal } from '@/components/payroll/GeneratePayrollModal';

interface Payslip {
  id: number;
  employee_name: string;
  period_display: string;
  basic_salary: string;
  net_pay: string;
  pph21_tax: string;
  status: string;
  details: any[];
}

export default function PayrollPage() {
  const t = useTranslations('Payroll');
  const tCommon = useTranslations('Common');
  
  const [payslips, setPayslips] = React.useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedPayslip, setSelectedPayslip] = React.useState<Payslip | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [payslipData, userData] = await Promise.all([
        apiFetch('/payslips'),
        apiFetch('/users/me'),
      ]);
      setPayslips(payslipData || []);
      setIsAdmin(userData.role === 'ADMIN' || userData.is_staff);
    } catch (error) {
      toast.error('Failed to load payroll data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPayroll = payslips.reduce((sum, p) => sum + parseFloat(p.net_pay || '0'), 0);
  const totalTax = payslips.reduce((sum, p) => sum + parseFloat(p.pph21_tax || '0'), 0);
  
  // BPJS is part of details, we can aggregate if needed but for now we'll sum the tax
  // In a real scenario, we'd have a specific endpoint for stats

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Restricted Access View for Employees with no payroll data. 
            Admins always see the page. Employees with data see the page. */}
        {!isLoading && !isAdmin && payslips.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
            <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
              <Eye size={40} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Restricted Access</h1>
            <p className="text-gray-500 max-w-sm mx-auto">
              You do not have the required permissions to access the Payroll Management module. 
              Please contact your administrator if you believe this is an error.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('title')}</h1>
                <p className="text-muted-foreground">{t('subtitle')}</p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <Play size={20} fill="currentColor" />
                  {t('runPayroll')}
                </button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 rounded-[32px] border border-white/10 relative overflow-hidden group"
              >
                <div className="absolute -right-4 -top-4 text-primary/5 group-hover:text-primary/10 transition-colors">
                  <Wallet size={120} />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">{t('stats.totalPayroll')}</p>
                <p className="text-4xl font-black text-white tracking-tighter">
                  Rp {totalPayroll.toLocaleString()}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                  <TrendingUp size={14} />
                  Live Sync Active
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-8 rounded-[32px] border border-white/10 bg-white/[0.02]"
              >
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">{t('stats.pph21')}</p>
                <p className="text-4xl font-black text-white tracking-tighter">
                  Rp {totalTax.toLocaleString()}
                </p>
                <div className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest">TER 2024 Category A/B/C</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-8 rounded-[32px] border border-white/10 bg-white/[0.02]"
              >
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">{t('stats.bpjs')}</p>
                <p className="text-4xl font-black text-white tracking-tighter">
                  Rp {(totalPayroll * 0.04).toLocaleString()}
                </p>
                <div className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest">Est. Employer Share (4%)</div>
              </motion.div>
            </div>

            {/* Payslip Table */}
            <div className="glass-card rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-tighter">{t('period')}</h2>
                    <p className="text-xs text-muted-foreground">Historical records and generated slips</p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('table.employee')}</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('table.basic')}</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('table.net')}</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('table.status')}</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">{t('table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr><td colSpan={5} className="p-20 text-center text-gray-500 animate-pulse font-mono uppercase tracking-widest">Syncing with Financial Engine...</td></tr>
                    ) : payslips.length === 0 ? (
                      <tr><td colSpan={5} className="p-20 text-center text-gray-500 italic">No payslips found for this period.</td></tr>
                    ) : payslips.map((row, index) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={row.id} 
                        className="hover:bg-white/[0.04] transition-all group"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-[2px]">
                              <div className="h-full w-full rounded-full bg-[#0f172a] flex items-center justify-center text-xs font-bold text-white">
                                {row.employee_name.split(' ').map(n => n[0]).join('')}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{row.employee_name}</p>
                              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">{row.period_display}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-medium text-gray-300">Rp {parseFloat(row.basic_salary).toLocaleString()}</td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-white">Rp {parseFloat(row.net_pay).toLocaleString()}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-1.5 w-fit",
                            row.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                          )}>
                            {row.status === 'PAID' ? <CheckCircle2 size={12} /> : <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />}
                            {row.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setSelectedPayslip(row)}
                              aria-label={`view-payslip-${row.id}`}
                              className="h-10 w-10 rounded-xl bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10 transition-all flex items-center justify-center border border-white/5"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => apiDownload(`/payslips/${row.id}/download_pdf`, `Payslip_${row.employee_name.replace(' ', '_')}.pdf`)}
                              aria-label={`download-payslip-${row.id}`}
                              className="h-10 w-10 rounded-xl bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10 transition-all flex items-center justify-center border border-white/5"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedPayslip && (
          <PayslipDetailModal 
            payslip={selectedPayslip} 
            onClose={() => setSelectedPayslip(null)} 
          />
        )}
        {isGenerateModalOpen && (
          <GeneratePayrollModal 
            onClose={() => setIsGenerateModalOpen(false)} 
            onSuccess={fetchData}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
