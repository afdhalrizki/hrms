'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Briefcase, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { getDomainSuffix } from '@/lib/api';

export interface LoginViewProps {
  forceShowForm?: boolean;
}

export function LoginView({ forceShowForm = false }: LoginViewProps) {
  const t = useTranslations('Auth');
  const { tenantName, isPublic } = useTenant();
  const { login } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Not public domain, OR
  // 2. Secret portal access (forceShowForm)
  const showForm = !isPublic || forceShowForm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsLoading(true);
      setError(null);
      const profile = await login(email, password);
      console.log('[Login] Profile received:', JSON.stringify(profile));
      
      // Redirect based on role or home
      if (profile?.is_global_admin) {
        router.push('/admin/registrations');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px]"
      >
        <div className="glass-card rounded-[2.5rem] border p-10 shadow-2xl space-y-8">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex h-16 w-16 rounded-xl bg-primary items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary/20 mx-auto mb-2 hover:scale-110 transition-transform">
              HK
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{t('loginTitle')}</h1>
            
            {!showForm ? (
              <div className="space-y-4 pt-2">
                <p className="text-lg font-medium text-foreground">
                  {t('restrictedTitle')}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('restrictedDesc', { example: `perusahaan.${getDomainSuffix()}` })}
                </p>
                
                <div className="pt-4 flex flex-col gap-3">
                  <a 
                    href="/signup" 
                    className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {t('registerNew')}
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {forceShowForm ? (
                    <span className="text-accent font-bold uppercase tracking-widest text-[10px] bg-accent/10 px-2 py-1 rounded-full border border-accent/20">
                      {t('portalBadge')}
                    </span>
                  ) : (
                    <>{t('welcomePortal', { name: tenantName })}</>
                  )}
                </p>
                {/* Form */}
                <form className="space-y-5 pt-4" onSubmit={handleSubmit}>
                  {error && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in slide-in-from-top-1">
                      {error}
                    </div>
                  )}
                  <div className="space-y-1.5 text-left">
                    <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{t('emailLabel')}</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                      <input 
                        id="email"
                        type="email" 
                        placeholder="name@company.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 rounded-2xl border border-transparent focus:border-primary/30 focus:bg-white/10 focus:outline-none transition-all text-foreground"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{t('passwordLabel')}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                      <input 
                        id="password"
                        type="password" 
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 rounded-2xl border border-transparent focus:border-primary/30 focus:bg-white/10 focus:outline-none transition-all text-foreground"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 accent-primary" />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{t('rememberMe')}</span>
                    </label>
                    <button type="button" className="text-sm font-semibold text-primary hover:underline underline-offset-4">{t('forgotPassword')}</button>
                  </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {t('signIn')}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          {showForm && (
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                {t('noAccount')} <span className="text-primary font-bold cursor-pointer hover:underline">{t('contactHR')}</span>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
