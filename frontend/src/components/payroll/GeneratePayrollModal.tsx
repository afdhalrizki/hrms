'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface Period {
  id: number;
  month: number;
  year: number;
  is_closed: boolean;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function GeneratePayrollModal({ onClose, onSuccess }: Props) {
  const t = useTranslations('Payroll');
  const tCommon = useTranslations('Common');
  
  const [periods, setPeriods] = React.useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isLoadingPeriods, setIsLoadingPeriods] = React.useState(true);

  React.useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const data = await apiFetch('/payroll-periods');
        setPeriods(data.filter((p: Period) => !p.is_closed));
        if (data.length > 0) setSelectedPeriod(data[0].id.toString());
      } catch (error) {
        toast.error('Failed to load payroll periods');
      } finally {
        setIsLoadingPeriods(false);
      }
    };
    fetchPeriods();
  }, []);

  const handleGenerate = async () => {
    if (!selectedPeriod) return;
    
    setIsGenerating(true);
    try {
      await apiFetch('/payslips/generate', {
        method: 'POST',
        body: JSON.stringify({ period_id: parseInt(selectedPeriod) }),
      });
      toast.success('Payroll generated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card w-full max-w-md bg-[#0f172a] p-8 rounded-[40px] border border-white/20 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Play size={24} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tighter">{t('modal.generateTitle')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex gap-3">
            <AlertCircle className="text-orange-500 shrink-0" size={20} />
            <p className="text-xs text-orange-200/70 leading-relaxed">
              Generating payroll will calculate BPJS, PPh 21 (TER 2024), and include approved Overtime/Reimbursements for the selected period.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
              {t('modal.selectPeriod')}
            </label>
            {isLoadingPeriods ? (
              <div className="h-14 bg-white/5 animate-pulse rounded-2xl" />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {periods.map(period => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id.toString())}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                      selectedPeriod === period.id.toString() 
                      ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10' 
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className={selectedPeriod === period.id.toString() ? 'text-primary' : 'text-gray-500'} />
                      <span className={`font-bold ${selectedPeriod === period.id.toString() ? 'text-white' : 'text-gray-400'}`}>
                        {new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {selectedPeriod === period.id.toString() && (
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedPeriod}
            className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : t('modal.generateBtn')}
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-bold text-gray-500 hover:text-white transition-colors"
          >
            {tCommon('cancel')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
