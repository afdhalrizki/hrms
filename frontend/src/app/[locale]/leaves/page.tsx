'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Briefcase, 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LeaveBalance {
  year: number;
  total_days: string;
  used_days: string;
  remaining_days: string;
}

interface LeaveRequest {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export default function LeavesPage() {
  const t = useTranslations('Leaves');
  const tCommon = useTranslations('Common');
  
  const [balances, setBalances] = React.useState<LeaveBalance[]>([]);
  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    leave_type: 'CUTI',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [balanceData, requestData] = await Promise.all([
        apiFetch('/leave-balances/'),
        apiFetch('/leave-requests/'),
      ]);
      setBalances(balanceData);
      setRequests(requestData);
    } catch (error) {
      toast.error('Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/leave-requests', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast.success(t('form.success'));
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit leave request');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
            <p className="text-muted-foreground">Manage your annual leave and absence history.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            {t('requestLeave')}
          </button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {balances.length > 0 ? balances.map((balance, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-3xl border border-white/10 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                  {t('remainingDays')} ({balance.year})
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-white leading-none">
                    {Math.floor(parseFloat(balance.remaining_days))}
                  </span>
                  <span className="text-sm font-medium text-gray-400 mb-1">Days</span>
                </div>
                <div className="mt-6 flex items-center gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{t('usedDays')}</p>
                    <p className="text-sm font-bold text-white">{parseFloat(balance.used_days)}</p>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Total Entitlement</p>
                    <p className="text-sm font-bold text-white">{parseFloat(balance.total_days)}</p>
                  </div>
                </div>
              </div>
              <Briefcase className="absolute -right-4 -bottom-4 h-32 w-32 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </motion.div>
          )) : (
            <div className="col-span-3 h-32 glass-card rounded-3xl border border-dashed border-white/10 flex items-center justify-center text-gray-500 italic">
              No leave balance records found for this year.
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">{t('history')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Start Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">End Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reason</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-500 animate-pulse uppercase text-xs font-bold tracking-widest">Loading records...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-500 italic">No leave history found.</td></tr>
                ) : requests.map((req) => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">{t(`form.${req.leave_type.toLowerCase()}`)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{req.start_date}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{req.end_date}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{req.reason}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5",
                          req.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" :
                          req.status === 'REJECTED' ? "bg-red-500/10 text-red-500" :
                          "bg-orange-500/10 text-orange-500"
                        )}>
                          {req.status === 'APPROVED' && <CheckCircle2 size={12} />}
                          {req.status === 'REJECTED' && <XCircle size={12} />}
                          {req.status === 'PENDING' && <Clock size={12} />}
                          {req.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-8 rounded-3xl border border-white/20 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-white mb-6 font-primary">{t('requestLeave')}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="leave_type" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t('form.type')}</label>
                  <select 
                    id="leave_type"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formData.leave_type}
                    onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                  >
                    <option value="CUTI">{t('form.annual')}</option>
                    <option value="SAKIT">{t('form.sick')}</option>
                    <option value="DARURAT">{t('form.emergency')}</option>
                    <option value="MELAHIRKAN">{t('form.maternity')}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start_date" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t('form.startDate')}</label>
                    <input 
                      id="start_date"
                      type="date"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="end_date" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t('form.endDate')}</label>
                    <input 
                      id="end_date"
                      type="date"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reason" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t('form.reason')}</label>
                  <textarea 
                    id="reason"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder={t('form.reasonPlaceholder')}
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    {tCommon('submit')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
