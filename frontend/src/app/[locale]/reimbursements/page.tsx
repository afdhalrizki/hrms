'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Receipt, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  DollarSign,
  PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch, getBaseUrl } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ReimbursementCategory {
  id: number;
  name: string;
  max_amount: string | null;
}

interface Reimbursement {
  id: number;
  category: { name: string };
  date: string;
  amount: string;
  approved_amount: string | null;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  attachment: string | null;
  created_at: string;
}

export default function ReimbursementsPage() {
  const t = useTranslations('Reimbursement');
  const tCommon = useTranslations('Common');
  
  const [categories, setCategories] = React.useState<ReimbursementCategory[]>([]);
  const [claims, setClaims] = React.useState<Reimbursement[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    category: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    attachment: null as File | null,
  });

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [catData, claimData] = await Promise.all([
        apiFetch('/reimbursement-categories/'),
        apiFetch('/reimbursements/'),
      ]);
      setCategories(catData || []);
      setClaims(claimData || []);
      
      if (catData && catData.length > 0) {
        setFormData(prev => ({ ...prev, category: catData[0].id.toString() }));
      }
    } catch (error) {
      toast.error('Failed to load reimbursement data');
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
      const data = new FormData();
      data.append('category', formData.category);
      data.append('amount', formData.amount);
      data.append('date', formData.date);
      data.append('description', formData.description);
      if (formData.attachment) {
        data.append('attachment', formData.attachment);
      }

      await apiFetch('/reimbursements/', {
        method: 'POST',
        body: data,
      });
      
      toast.success('Reimbursement claim submitted');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Submission failed');
    }
  };

  const pendingTotal = claims
    .filter(c => c.status === 'PENDING')
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);
    
  const approvedTotal = claims
    .filter(c => c.status === 'APPROVED')
    .reduce((sum, c) => sum + parseFloat(c.approved_amount || c.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
            <p className="text-muted-foreground">Submit and track your business expense claims.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            {t('newClaim')}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 rounded-3xl border border-white/10 flex items-center gap-6"
          >
            <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <PieChart size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t('stats.pending')}</p>
              <p className="text-3xl font-black text-white">IDR {pendingTotal.toLocaleString()}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 rounded-3xl border border-white/10 flex items-center gap-6"
          >
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t('stats.approved')}</p>
              <p className="text-3xl font-black text-white">IDR {approvedTotal.toLocaleString()}</p>
            </div>
          </motion.div>
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
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reason</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-500 animate-pulse uppercase text-xs font-bold tracking-widest">Loading...</td></tr>
                ) : claims.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-500 italic">No claims found.</td></tr>
                ) : claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{claim.category?.name || 'General'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{claim.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 truncate max-w-[200px]">{claim.description}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-white">IDR {parseFloat(claim.amount).toLocaleString()}</p>
                      {claim.approved_amount && (
                        <p className="text-[10px] text-emerald-500 font-bold">Approved: {parseFloat(claim.approved_amount).toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5",
                          claim.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" :
                          claim.status === 'REJECTED' ? "bg-red-500/10 text-red-500" :
                          "bg-orange-500/10 text-orange-500"
                        )}>
                          {claim.status === 'APPROVED' && <CheckCircle2 size={12} />}
                          {claim.status === 'REJECTED' && <XCircle size={12} />}
                          {claim.status === 'PENDING' && <Clock size={12} />}
                          {claim.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {claim.attachment ? (
                          <a 
                            href={claim.attachment.startsWith('http') ? claim.attachment : `${getBaseUrl().replace('/api', '')}${claim.attachment}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-primary"
                          >
                            <FileText size={18} />
                          </a>
                        ) : (
                          <span className="text-gray-600 italic text-xs">No file</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Claim Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-lg p-8 rounded-[40px] border border-white/20 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Receipt size={24} />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tighter">{t('newClaim')}</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="category" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">{t('form.category')}</label>
                    <select 
                      id="category"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      required
                    >
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="date" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">{t('form.date')}</label>
                    <input 
                      id="date"
                      type="date"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">{t('form.amount')} (IDR)</label>
                  <input 
                    id="amount"
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-2xl font-black text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">{t('form.description')}</label>
                  <textarea 
                    id="description"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all"
                    placeholder="Provide details for this expense..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>

                <div className="p-6 border border-dashed border-white/20 rounded-3xl bg-white/5 hover:bg-white/10 transition-colors group relative cursor-pointer">
                  <input 
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => setFormData({...formData, attachment: e.target.files?.[0] || null})}
                    accept="image/*,application/pdf"
                  />
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="h-12 w-12 rounded-full border-2 border-primary/40 border-dashed flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        {formData.attachment ? formData.attachment.name : t('form.attachment')}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 font-mono">Max 10MB (PDF, JPG, PNG)</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all"
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
