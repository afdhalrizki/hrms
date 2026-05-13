'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { CheckCircle2, ShieldCheck, Zap, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('About');
  
  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-32">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tighter"
          >
            {t('title')} <span className="text-primary">HariKerja</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-3xl mx-auto font-medium"
          >
            {t('heroDesc')}
          </motion.p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32">
          <div className="space-y-8">
            <h2 className="text-3xl font-black tracking-tight">{t('visionTitle')}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t('visionDesc')}
            </p>
            <div className="space-y-4">
              {[
                t('visionFeature1'),
                t('visionFeature2'),
                t('visionFeature3'),
                t('visionFeature4')
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="text-primary shrink-0" size={20} />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-primary/20 to-accent/20 border border-glass-border flex items-center justify-center overflow-hidden">
               <img 
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop" 
                alt="Team working" 
                className="w-full h-full object-cover opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {[
            {
              icon: <ShieldCheck className="text-primary" size={32} />,
              title: t('principle1Title'),
              desc: t('principle1Desc')
            },
            {
              icon: <Zap className="text-accent" size={32} />,
              title: t('principle2Title'),
              desc: t('principle2Desc')
            },
            {
              icon: <Heart className="text-primary" size={32} />,
              title: t('principle3Title'),
              desc: t('principle3Desc')
            }
          ].map((item, i) => (
            <div key={i} className="p-10 rounded-[2.5rem] border border-glass-border bg-white/5 space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-background flex items-center justify-center shadow-lg">
                {item.icon}
              </div>
              <h3 className="text-2xl font-bold">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="text-center space-y-8 bg-primary/5 rounded-[3rem] p-12 md:p-20 border border-primary/10">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter">{t('ctaTitle')}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            {t('ctaDesc')}
          </p>
          <div className="pt-4">
            <a href="/signup" className="inline-flex px-10 py-5 bg-primary text-white rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30">
              {t('ctaBtn')}
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
