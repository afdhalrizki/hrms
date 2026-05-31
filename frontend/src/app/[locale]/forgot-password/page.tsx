'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('Auth');
  const { tenantName, isPublic, isValid } = useTenant();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const response = await apiFetch('/auth/forgot-password/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      setSuccessMessage(response?.detail || t('resetEmailSent'));
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim link reset kata sandi.');
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
            <h1 className="text-3xl font-bold tracking-tight">{t('forgotPasswordTitle')}</h1>
            <p className="text-sm text-muted-foreground">
              {!isPublic && tenantName ? `${t('welcomePortal', { name: tenantName })}` : t('forgotPasswordDesc')}
            </p>
          </div>

          {successMessage ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium leading-relaxed">
                {successMessage}
              </div>
              <Link
                href="/login"
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                {t('backToLogin')}
              </Link>
            </div>
          ) : (
            <form className="space-y-5 pt-2" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-500/5 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
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
                    required
                    placeholder="name@company.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 rounded-2xl border border-transparent focus:border-primary/30 focus:bg-white/10 focus:outline-none transition-all text-foreground"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
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
                    {t('sendResetLink')}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline transition-all inline-flex items-center gap-1.5">
                  <ArrowLeft size={16} />
                  {t('backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
