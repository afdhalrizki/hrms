'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  Globe, 
  ArrowRight, 
  CheckCircle2,
  ShieldCheck,
  Zap,
  Layout
} from 'lucide-react';
import { apiFetch, getDomainSuffix } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function SignupPage() {
  const t = useTranslations('Signup');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    company_name: '',
    subdomain_prefix: '',
    admin_email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch('/public/signup', {
        method: 'POST',
        body: JSON.stringify(formData),
        credentials: 'omit',
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-black to-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card max-w-md w-full p-10 rounded-[2.5rem] border border-white/10 text-center space-y-6"
        >
          <div className="h-20 w-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{t('successTitle')}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t('successDesc', { name: formData.company_name })}
          </p>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-sm text-left">
            <p className="text-muted-foreground mb-1">{t('confirmationMsg')}</p>
            <p className="font-medium">{formData.admin_email}</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
          >
            {t('backHome')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 grid lg:grid-cols-2 min-h-screen">
        {/* Left Side: Brand & Social Proof */}
        <div className="hidden lg:flex flex-col justify-between p-16 bg-white/[0.02] border-r border-white/5">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
              HK
            </div>
            <span className="text-xl font-bold tracking-tighter">HariKerja HRMS</span>
          </Link>

          <div className="space-y-8">
            <motion.h1 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-6xl font-extrabold tracking-tighter leading-[1.1]"
            >
              {t.raw('heroTitle').includes('tanpa batas') ? (
                <>
                  Tingkatkan produktivitas tim Anda <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                    tanpa batas.
                  </span>
                </>
              ) : (
                <>
                  Scale your workforce <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                    without limits.
                  </span>
                </>
              )}
            </motion.h1>
            
            <div className="grid gap-6">
              {[
                { icon: ShieldCheck, title: t('heroFeature1Title'), desc: t('heroFeature1Desc') },
                { icon: Zap, title: t('heroFeature2Title'), desc: t('heroFeature2Desc') },
                { icon: Layout, title: t('heroFeature3Title'), desc: t('heroFeature3Desc') }
              ].map((feat, i) => (
                <motion.div 
                  key={feat.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex gap-4 items-start"
                >
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 mt-1">
                    <feat.icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feat.title}</h3>
                    <p className="text-sm text-muted-foreground">{feat.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground font-medium">
            © 2026 HariKerja HRMS. All rights reserved.
          </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="flex items-center justify-center p-6 md:p-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-10"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
              <p className="text-muted-foreground font-medium">
                {t('subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">{t('companyName')}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-white transition-colors">
                      <Building2 size={18} />
                    </div>
                    <input
                      required
                      name="company_name"
                      type="text"
                      placeholder={t('companyPlaceholder')}
                      onChange={handleChange}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">{t('subdomainLabel')}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-white transition-colors">
                      <Globe size={18} />
                    </div>
                    <input
                      required
                      name="subdomain_prefix"
                      type="text"
                      placeholder={t('subdomainPlaceholder')}
                      onChange={handleChange}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-32 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-white/20"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <span className="text-sm font-bold text-muted-foreground">.{getDomainSuffix()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">{t('adminEmail')}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-white transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      required
                      name="admin_email"
                      type="email"
                      placeholder={t('adminPlaceholder')}
                      onChange={handleChange}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl flex items-center gap-2"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full bg-primary text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group shadow-xl shadow-primary/20",
                  loading ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t('submitBtn')}
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {t('terms')}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
