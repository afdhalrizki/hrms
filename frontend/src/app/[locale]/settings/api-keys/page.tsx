'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Key, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CreateApiKeyModal } from '@/components/settings/CreateApiKeyModal';

interface APIKey {
  id: number;
  label: string;
  key_prefix: string;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ApiKeysPage() {
  const t = useTranslations('APIKeys');
  const tCommon = useTranslations('Common');
  
  const [keys, setKeys] = React.useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { user, loading: authLoading } = useAuth();

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/api-keys');
      setKeys(data || []);
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [fetchData, authLoading, user]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    
    try {
      await apiFetch(`/api-keys/${id}`, { method: 'DELETE' });
      toast.success('API Key revoked');
      fetchData();
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Zap className="text-primary" size={32} fill="currentColor" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            {t('newKey')}
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-6 rounded-[24px] bg-gradient-to-r from-primary/10 to-accent/10 border border-white/5 flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Developer Integration</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
              Use these keys to integrate HariKerja with your internal ERP, accounting software, or automation tools. 
              API keys provide full administrative access to your workspace data.
            </p>
          </div>
        </div>

        {/* Keys List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2].map(i => (
                <div key={i} className="h-48 glass-card rounded-3xl animate-pulse bg-white/5" />
              ))
            ) : keys.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-card border-dashed border-white/10 rounded-[32px]">
                <Key size={48} className="mx-auto text-gray-600 mb-4 opacity-20" />
                <p className="text-gray-500 italic font-medium">{t('empty')}</p>
              </div>
            ) : keys.map((key) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={key.id}
                className="glass-card p-8 rounded-[32px] border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all relative group overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                  <Key size={100} />
                </div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
                    Active
                  </div>
                  <button 
                    onClick={() => handleDelete(key.id)}
                    className="h-8 w-8 rounded-full hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center text-gray-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight truncate pr-8">{key.label}</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-1">Pre: {key.key_prefix}***</p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{t('table.lastUsed')}</p>
                      <p className="text-xs text-gray-300 font-medium font-mono">
                        {key.last_used_at ? format(new Date(key.last_used_at), 'MMM dd, HH:mm') : 'Never'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Created</p>
                      <p className="text-xs text-gray-400">{format(new Date(key.created_at), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <CreateApiKeyModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={fetchData} 
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
