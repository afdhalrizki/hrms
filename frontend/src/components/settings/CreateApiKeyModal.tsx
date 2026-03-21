'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Copy, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateApiKeyModal({ onClose, onSuccess }: Props) {
  const t = useTranslations('APIKeys.modal');
  const tCommon = useTranslations('Common');
  
  const [label, setLabel] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) return;

    setIsSubmitting(true);
    try {
      const data = await apiFetch('/core/api-keys/', {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      setSecret(data.secret_key); // Serializer returns secret_key ONLY on create
      toast.success(t('success'));
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-card w-full max-w-md bg-[#0f172a] p-8 rounded-[40px] border border-white/20 shadow-2xl overflow-hidden relative"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Key size={24} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tighter">{t('title')}</h2>
          </div>
          <button 
            onClick={secret ? () => { onSuccess(); onClose(); } : onClose} 
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!secret ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
                {t('label')}
              </label>
              <input
                autoFocus
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. ERP Integration"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !label}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : tCommon('submit')}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
              <AlertTriangle className="text-orange-500 shrink-0" size={20} />
              <p className="text-xs text-orange-200/80 leading-relaxed font-bold">
                {t('warning')}
              </p>
            </div>

            <div className="relative group">
              <div className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-6 font-mono text-sm text-emerald-400 break-all pr-12">
                {secret}
              </div>
              <button
                onClick={handleCopy}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {copied ? <Check className="text-emerald-500" size={20} /> : <Copy size={20} />}
              </button>
            </div>

            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
