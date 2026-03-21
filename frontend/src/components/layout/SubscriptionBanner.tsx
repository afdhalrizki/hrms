'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';

export function SubscriptionBanner() {
  const t = useTranslations('Subscription');
  const { subscriptionStatus, expiryDate } = useTenant();

  if (subscriptionStatus !== 'EXPIRED') return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2 text-amber-500">
        <AlertCircle size={16} />
        <p className="text-xs font-medium">
          {t('readOnlyMessage', { date: expiryDate || 'N/A' })}
        </p>
      </div>
      <button className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20">
        <RefreshCw size={10} />
        {t('renewNow')}
      </button>
    </div>
  );
}
