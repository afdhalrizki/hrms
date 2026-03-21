'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MessageSquare, ShieldCheck, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  appraisalId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const RATING_KEYS = ['quality', 'communication', 'reliability', 'teamwork'];

export function AppraisalReviewModal({ appraisalId, onClose, onSuccess }: Props) {
  const t = useTranslations('Performance.modal');
  const tCommon = useTranslations('Common');
  
  const [reviewerType, setReviewerType] = React.useState<'SELF' | 'MANAGER'>('SELF');
  const [ratings, setRatings] = React.useState<Record<string, number>>({
    quality: 3,
    communication: 3,
    reliability: 3,
    teamwork: 3
  });
  const [comments, setComments] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const fetchMe = async () => {
      try {
        const userData = await apiFetch('/users/me/');
        // We need the employee ID associated with this user
        const employees = await apiFetch(`/core/employees/?email=${userData.email}`);
        if (employees.length > 0) {
          setEmployeeId(employees[0].id);
        }
      } catch (error) {
        toast.error('Failed to identify your employee profile');
      }
    };
    fetchMe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    setIsSubmitting(true);
    try {
      await apiFetch('/performance/appraisal-reviews/', {
        method: 'POST',
        body: JSON.stringify({
          appraisal: appraisalId,
          reviewer: employeeId,
          reviewer_type: reviewerType,
          ratings: ratings,
          comments: comments
        }),
      });
      toast.success('Score submitted successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="glass-card w-full max-w-2xl bg-[#0f172a] rounded-[40px] border border-white/10 shadow-3xl overflow-hidden"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Star size={24} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter">{t('submitReview')}</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Appraisal #{appraisalId}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/5 text-gray-400 transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Reviewer Type Toggle */}
          <div className="flex gap-4 p-1 bg-white/5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setReviewerType('SELF')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                reviewerType === 'SELF' ? "bg-primary text-white shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              {t('selfReview')}
            </button>
            <button
              type="button"
              onClick={() => setReviewerType('MANAGER')}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                reviewerType === 'MANAGER' ? "bg-indigo-500 text-white shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              {t('managerReview')}
            </button>
          </div>

          {/* Ratings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {RATING_KEYS.map((key) => (
              <div key={key} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 group hover:border-primary/20 transition-all">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-primary transition-colors">
                    {t(`ratings.${key}`)}
                  </label>
                  <span className="text-lg font-black text-white">{ratings[key]}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRatings({ ...ratings, [key]: val })}
                      className={cn(
                        "h-10 flex-1 rounded-xl flex items-center justify-center border transition-all",
                        ratings[key] >= val 
                          ? "bg-primary/20 border-primary text-primary" 
                          : "bg-white/5 border-white/5 text-gray-600 hover:border-white/20"
                      )}
                    >
                      <Star size={14} fill={ratings[key] >= val ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <MessageSquare size={14} />
              {t('commentLabel')}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[120px] placeholder:text-gray-700 disabled:opacity-50"
              placeholder="Provide specific examples and areas for growth..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !employeeId}
            className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : t('submitScore')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
