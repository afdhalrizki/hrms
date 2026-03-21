'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, Wallet, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiDownload } from '@/lib/api';

interface PayslipDetail {
  id: number;
  description: string;
  amount: string;
  is_deduction: boolean;
}

interface Payslip {
  id: number;
  employee_name: string;
  period_display: string;
  basic_salary: string;
  net_pay: string;
  pph21_tax: string;
  status: string;
  details: PayslipDetail[];
}

interface Props {
  payslip: Payslip;
  onClose: () => void;
}

export function PayslipDetailModal({ payslip, onClose }: Props) {
  const t = useTranslations('Payroll.modal');
  const tCommon = useTranslations('Common');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-card w-full max-w-2xl bg-[#0f172a] rounded-[32px] border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{t('detailTitle')}</h2>
              <p className="text-sm text-muted-foreground">{payslip.employee_name} • {payslip.period_display}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Allowances / Earnings */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <div className="h-1 w-4 bg-emerald-500 rounded-full" />
                {t('allowances')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <span className="text-sm text-gray-400">{t('basicSalary')}</span>
                  <span className="text-sm font-bold text-white">Rp {parseFloat(payslip.basic_salary).toLocaleString()}</span>
                </div>
                {payslip.details.filter(d => !d.is_deduction).map(detail => (
                  <div key={detail.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <span className="text-sm text-gray-400">{detail.description}</span>
                    <span className="text-sm font-bold text-white">Rp {parseFloat(detail.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <div className="h-1 w-4 bg-red-500 rounded-full" />
                {t('deductions')}
              </h3>
              <div className="space-y-3">
                {payslip.details.filter(d => d.is_deduction).map(detail => (
                  <div key={detail.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <span className="text-sm text-gray-400">{detail.description}</span>
                    <span className="text-sm font-bold text-red-400">-(Rp {parseFloat(detail.amount).toLocaleString()})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Final Summary Card */}
          <div className="mt-8 p-6 rounded-[24px] bg-gradient-to-br from-primary/20 to-indigo-500/5 border border-primary/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Wallet size={80} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{t('takeHomePay')}</p>
                <p className="text-4xl font-black text-white tracking-tighter">
                  Rp {parseFloat(payslip.net_pay).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => apiDownload(`/payroll/payslips/${payslip.id}/download_pdf/`, `Payslip_${payslip.employee_name.replace(' ', '_')}.pdf`)}
                className="px-6 py-3 bg-white text-black rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-xl shadow-white/5"
              >
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
