'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { AttendanceCorrectionRequest } from '@/types/core';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface CorrectionRequestListProps {
  requests: AttendanceCorrectionRequest[];
  onAction?: () => void;
  isAdmin?: boolean;
}

export const CorrectionRequestList: React.FC<CorrectionRequestListProps> = ({
  requests,
  onAction,
  isAdmin = false
}) => {
  const t = useTranslations('AttendanceCorrection');
  const tCommon = useTranslations('Common');

  const handleProcess = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    const comment = window.prompt(`${t('enterComment')} ${action.toLowerCase()}:`);
    if (comment === null) return;

    try {
      await apiFetch(`/attendance-corrections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action, comment }),
      });
      toast.success(t('processed', { action: action.toLowerCase() }));
      onAction?.();
    } catch (error) {
      toast.error(t('fail'));
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    }
  };

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Clock size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest leading-none">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {requests.map((request, i) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          key={request.id}
          className="glass-card p-6 border border-white/10 rounded-3xl bg-white/5 hover:bg-white/[0.07] transition-all group"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                <User size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg">{request.employee_name}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                    getStatusStyles(request.status)
                  )}>
                    {request.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium italic">
                  <span>{t('correctionFor')} {request.attendance_date}</span>
                  <span>•</span>
                  <span>{tCommon('joined_days_ago', { days: 0 })} {new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 md:gap-12">
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('requestedChange')}</p>
                    <div className="flex items-center gap-3 text-white font-mono text-sm font-bold bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                      <span>{request.requested_check_in || '--:--'}</span>
                      <ArrowRight size={14} className="text-gray-600" />
                      <span>{request.requested_check_out || '--:--'}</span>
                    </div>
                  </div>
                </div>
                
                {request.reason && (
                  <div className="flex items-start gap-2 max-w-sm">
                    <MessageSquare size={14} className="mt-1 text-primary shrink-0" />
                    <p className="text-sm text-gray-300 italic">"{request.reason}"</p>
                  </div>
                )}
              </div>

              {isAdmin && request.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleProcess(request.id, 'REJECTED')}
                    className="p-3 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all font-bold text-xs uppercase"
                  >
                    <XCircle size={20} />
                  </button>
                  <button
                    onClick={() => handleProcess(request.id, 'APPROVED')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all font-bold text-xs uppercase"
                  >
                    <CheckCircle2 size={18} />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {request.comment && (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3 text-[11px] text-gray-400">
              <span className="font-bold uppercase tracking-wider text-gray-600">{t('adminComment')}:</span>
              <span className="italic">"{request.comment}"</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
