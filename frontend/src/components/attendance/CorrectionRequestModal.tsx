'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertCircle, Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { Attendance } from '@/types/core';
import { toast } from 'sonner';

interface CorrectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: Attendance;
  onSuccess: () => void;
}

export const CorrectionRequestModal: React.FC<CorrectionRequestModalProps> = ({
  isOpen,
  onClose,
  attendance,
  onSuccess
}) => {
  const t = useTranslations('AttendanceCorrection');
  const tCommon = useTranslations('Common');
  
  const [formData, setFormData] = useState({
    requested_check_in: attendance.check_in || '',
    requested_check_out: attendance.check_out || '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      toast.error(t('reasonRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/attendance-correction-requests', {
        method: 'POST',
        body: JSON.stringify({
          attendance: attendance.id,
          requested_check_in: formData.requested_check_in || null,
          requested_check_out: formData.requested_check_out || null,
          reason: formData.reason
        }),
      });
      toast.success(t('success'));
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(t('fail'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-card border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl bg-[#0f172a]/80"
          >
            <div className="p-8">
              <button 
                onClick={onClose}
                className="absolute right-6 top-6 p-2 text-gray-400 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                  <AlertCircle size={12} />
                  {t('requestTitle')}
                </div>
                <h2 className="text-2xl font-bold text-white">{t('requestTitle')}</h2>
                <p className="text-sm text-gray-400">{tCommon('joined_days_ago', { days: 0 })} {attendance.date}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={12} />
                      {t('requestedIn')}
                    </label>
                    <input 
                      type="time" 
                      step="1"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      value={formData.requested_check_in}
                      onChange={(e) => setFormData(prev => ({ ...prev, requested_check_in: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={12} />
                      {t('requestedOut')}
                    </label>
                    <input 
                      type="time" 
                      step="1"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      value={formData.requested_check_out}
                      onChange={(e) => setFormData(prev => ({ ...prev, requested_check_out: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('reasonLabel')}</label>
                  <textarea 
                    required
                    placeholder={t('reasonLabel')}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none text-sm placeholder:text-gray-600"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="flex-1 px-6 py-3.5 rounded-2xl border border-white/10 text-white text-sm font-bold hover:bg-white/5 transition-all"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {t('submit')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
