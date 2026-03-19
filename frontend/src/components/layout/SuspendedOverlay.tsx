'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert, Download, LogOut, Loader2 } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { apiFetch, getBaseUrl } from '@/lib/api';

export function SuspendedOverlay() {
  const t = useTranslations('Subscription');
  const { subscriptionStatus, tenantName } = useTenant();
  const [isExporting, setIsExporting] = useState(false);

  if (subscriptionStatus !== 'SUSPENDED') return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // In a real scenario, this would trigger a download of the CSV zip or similar
      // For now, we point to the export endpoint
      window.location.href = `${getBaseUrl()}/tenant/export_data/`;
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsExporting(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in zoom-in duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-red-500/20 flex items-center justify-center text-red-500 shadow-2xl shadow-red-500/20">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {t('suspendedTitle')}
          </h1>
          <p className="text-slate-400">
            {t('suspendedMessage', { name: tenantName })}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {t('renewNow')}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {t('emergencyExport')}
            </button>
            <button 
              onClick={() => window.location.href = '/api/auth/logout/'}
              className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
          SaaS Compliance Mode Enabled
        </p>
      </div>
    </div>
  );
}
