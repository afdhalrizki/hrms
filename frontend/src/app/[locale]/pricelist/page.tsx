'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Check, Info, HelpCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSalesEmail } from '@/lib/api';
import { useTranslations } from 'next-intl';

export default function PriceListPage() {
  const t = useTranslations('Pricing');

  const plans = [
    {
      name: "FREE",
      price: "0",
      description: t('free.desc'),
      features: [
        t('free.f1'),
        t('free.f2'),
        t('free.f3'),
        t('free.f4'),
        t('free.f5'),
        t('free.f6')
      ],
      buttonText: t('free.btn'),
      highlight: false
    },
    {
      name: "ESSENTIAL",
      price: "125.000",
      period: t('essential.period'),
      description: t('essential.desc'),
      features: [
        t('essential.f1'),
        t('essential.f2'),
        t('essential.f3'),
        t('essential.f4'),
        t('essential.f5')
      ],
      buttonText: t('essential.btn'),
      highlight: false
    },
    {
      name: "PROFESSIONAL",
      price: "750.000",
      period: t('professional.period'),
      description: t('professional.desc'),
      features: [
        t('professional.f1'),
        t('professional.f2'),
        t('professional.f3'),
        t('professional.f4'),
        t('professional.f5'),
        t('professional.f6')
      ],
      buttonText: t('professional.btn'),
      highlight: true
    },
    {
      name: "PREMIUM",
      price: "1.500.000",
      period: t('premium.period'),
      description: t('premium.desc'),
      features: [
        t('premium.f1'),
        t('premium.f2'),
        t('premium.f3'),
        t('premium.f4'),
        t('premium.f5'),
        t('premium.f6')
      ],
      buttonText: t('premium.btn'),
      highlight: false
    },
    {
      name: "ENTERPRISE",
      price: t('enterprise.price'),
      description: t('enterprise.desc'),
      features: [
        t('enterprise.f1'),
        t('enterprise.f2'),
        t('enterprise.f3'),
        t('enterprise.f4'),
        t('enterprise.f5'),
        t('enterprise.f6')
      ],
      buttonText: t('enterprise.btn'),
      highlight: false
    }
  ];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center space-y-6 mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black tracking-tighter"
          >
            {t('title1')} <br />
            <span className="text-primary">{t('title2')}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-20">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative flex flex-col p-8 rounded-[2rem] border transition-all hover:scale-[1.02]",
                plan.highlight 
                  ? "bg-primary text-white border-primary shadow-2xl shadow-primary/30 z-10 scale-105" 
                  : "bg-white/5 border-glass-border hover:border-primary/50"
              )}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-accent text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
                  {t('recommended')}
                </div>
              )}
              
              <div className="mb-8">
                <h3 className={cn("text-lg font-black tracking-widest mb-4", plan.highlight ? "text-white/90" : "text-primary")}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  {plan.name !== 'ENTERPRISE' && <span className="text-sm font-bold opacity-70">Rp</span>}
                  <span className="text-4xl font-black tracking-tighter">{plan.price}</span>
                  {plan.period && <span className="text-sm font-medium opacity-70">{plan.period}</span>}
                </div>
                <p className={cn("mt-4 text-sm leading-relaxed", plan.highlight ? "text-white/80" : "text-muted-foreground")}>
                  {plan.description}
                </p>
              </div>

              <div className="flex-grow space-y-4 mb-8 text-sm">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={16} className={cn("shrink-0 mt-0.5", plan.highlight ? "text-white" : "text-primary")} />
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <a 
                href={plan.name === 'ENTERPRISE' ? `mailto:${getSalesEmail()}` : '/signup'}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-center transition-all",
                  plan.highlight
                    ? "bg-white text-primary hover:bg-white/90"
                    : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                )}
              >
                {plan.buttonText}
              </a>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section Placeholder */}
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight flex items-center justify-center gap-3">
              <HelpCircle className="text-primary" /> {t('faq.title')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-8 glass-card rounded-3xl">
              <h4 className="font-bold text-lg">{t('faq.q1')}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('faq.a1')}
              </p>
            </div>
            <div className="space-y-4 p-8 glass-card rounded-3xl">
              <h4 className="font-bold text-lg">{t('faq.q2')}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('faq.a2')}
              </p>
            </div>
            <div className="space-y-4 p-8 glass-card rounded-3xl">
              <h4 className="font-bold text-lg">{t('faq.q3')}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('faq.a3')}
              </p>
            </div>
            <div className="space-y-4 p-8 glass-card rounded-3xl">
              <h4 className="font-bold text-lg">{t('faq.q4')}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('faq.a4')}
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-20 p-8 rounded-[2rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <Zap className="text-primary" />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h4 className="font-bold">{t('addon.title')}</h4>
            <p className="text-muted-foreground text-sm">
              {t('addon.desc1')} <strong>{t('addon.strong1')}</strong> {t('addon.desc2')} <strong>{t('addon.strong2')}</strong>{t('addon.desc3')} <strong>{t('addon.strong3')}</strong> {t('addon.desc4')} <strong>{t('addon.strong4')}</strong> {t('addon.desc5')}
            </p>
          </div>
          <a href="/signup" className="font-bold text-primary hover:underline">{t('addon.link')}</a>
        </div>
      </div>
    </PublicLayout>
  );
}
