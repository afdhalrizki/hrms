'use client';

import React from 'react';
import { useTenant } from '@/context/TenantContext';
import { useTranslations } from 'next-intl';
import { ShieldAlert, Rocket } from 'lucide-react';

interface FeatureGuardProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showInUpgradePrompt?: boolean;
}

export function FeatureGuard({ 
  module, 
  children, 
  fallback,
  showInUpgradePrompt = false 
}: FeatureGuardProps) {
  const { enabledModules, planType } = useTenant();
  const t = useTranslations('Tiering');

  console.log(`Checking access for module: ${module}. Plan: ${planType}, Enabled: ${JSON.stringify(enabledModules)}`);
  
  // If planning type is Enterprise, always grant access (Safety fallback)
  const hasAccess = planType === 'ENTERPRISE' || (enabledModules?.includes(module));

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showInUpgradePrompt) {
    return (
      <div className="glass-card p-12 rounded-[40px] border border-white/10 bg-white/[0.02] flex flex-col items-center text-center space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary">
          <ShieldAlert size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white">{t('upgradeTitle')}</h3>
          <p className="text-muted-foreground max-w-sm">
            {t('upgradeNeeded', { module })}
          </p>
        </div>
        <button className="px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all flex items-center gap-2">
          <Rocket size={18} />
          {t('upgradeBtn')}
        </button>
      </div>
    );
  }

  return null;
}
