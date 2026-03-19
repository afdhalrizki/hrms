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
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiDownload } from '@/lib/api';

const payrollData = [
  { id: 1, name: 'John Doe', period: 'Mar 2026', basic: 'Rp 12,000,000', net: 'Rp 13,500,000', status: 'PAID' },
  { id: 2, name: 'Jane Smith', period: 'Mar 2026', basic: 'Rp 15,000,000', net: 'Rp 16,200,000', status: 'PROCESSING' },
  { id: 3, name: 'Alice Johnson', period: 'Mar 2026', basic: 'Rp 9,000,000', net: 'Rp 9,500,000', status: 'PAID' },
];

export default function PayrollPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
            <p className="text-sm text-muted-foreground">Calculate salaries, taxes (PPh 21), and generate payslips.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
            Run Payroll System
          </button>
        </div>

        {/* Wealth Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6 border relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-primary/5 group-hover:text-primary/10 transition-colors">
              <Wallet size={120} />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1 underline decoration-primary/30 underline-offset-4">Total Payroll (Mar)</p>
            <p className="text-3xl font-bold tracking-tight">Rp 42.5M</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500 font-bold">
              <TrendingUp size={14} />
              +5.2% from last month
            </div>
          </div>
          <div className="glass-card rounded-3xl p-6 border bg-white/5">
            <p className="text-sm font-medium text-muted-foreground mb-1">PPh 21 Deducted</p>
            <p className="text-3xl font-bold tracking-tight">Rp 3.8M</p>
            <div className="mt-4 text-xs text-muted-foreground">Estimated for all employees</div>
          </div>
          <div className="glass-card rounded-3xl p-6 border bg-white/5">
            <p className="text-sm font-medium text-muted-foreground mb-1">BPJS Contribution</p>
            <p className="text-3xl font-bold tracking-tight">Rp 2.1M</p>
            <div className="mt-4 text-xs text-muted-foreground">Company + Employee share</div>
          </div>
        </div>

        {/* Payroll List */}
        <div className="glass-card rounded-3xl border overflow-hidden">
          <div className="p-6 border-b bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText size={20} />
              </div>
              <h2 className="font-bold text-lg">Payroll Period: March 2026</h2>
            </div>
            <button className="text-sm font-bold text-primary hover:underline">View All History</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Basic Salary</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Net Pay</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payrollData.map((row, index) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    key={row.id} 
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.period}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{row.basic}</td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">{row.net}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider",
                        row.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                      )}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:text-primary hover:bg-white/10 transition-all">
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => apiDownload(`payslips/${row.id}/download_pdf/`, `Payslip_${row.period.replace(' ', '_')}.pdf`)}
                          className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:text-primary hover:bg-white/10 transition-all"
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
