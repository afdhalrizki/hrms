'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Shield, 
  User, 
  Clock, 
  Database, 
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  model_name: string;
  object_id: string;
  changed_fields: Record<string, any>;
  actor_name: string | null;
  ip_address: string | null;
  timestamp: string;
}

export default function AuditLogsPage() {
  const t = useTranslations('Audit');
  const tCommon = useTranslations('Common');
  
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const { user, loading: authLoading } = useAuth();

  const fetchData = React.useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const data = await apiFetch('/audit-logs');
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      if (!isSilent) toast.error('Failed to load audit logs');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
    if (!authLoading) {
      if (user) {
        fetchData();
        
        // Implement silent polling for "Live Tracking"
        const interval = setInterval(() => {
          fetchData(true);
        }, 10000); // 10 seconds
        
        return () => clearInterval(interval);
      } else {
        setIsLoading(false);
      }
    }
  }, [fetchData, authLoading, user]);

  // Helper for safe date formatting
  const formatDateSafe = (dateStr: string, formatStr: string) => {
    try {
      if (!dateStr) return '---';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, formatStr);
    } catch (e) {
      return '---';
    }
  };

  // Helper to extract a displayable identifier from potentially nested changed_fields
  const getIdentifier = (log: AuditLog) => {
    const fields = log.changed_fields || {};
    // Priority fields: name, fullname
    for (const key of ['name', 'fullname']) {
      const val = fields[key];
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null && val.new !== undefined) return String(val.new);
    }
    return `#${log.object_id}`;
  };

  if (!isMounted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full p-20 text-gray-500 font-mono text-xs uppercase tracking-widest animate-pulse italic">
          Initializing audit interface...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Shield className="text-primary" size={32} />
              {t('title')}
            </h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              id="refresh-audit-logs"
              onClick={() => fetchData(false)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-400 transition-all flex items-center gap-2"
            >
              <Activity size={14} className={cn("text-emerald-500", isLoading && "animate-spin")} />
              {isLoading ? tCommon('loading') : 'Refresh Now'}
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Live Tracking Active
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="glass-card rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('table.timestamp')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('table.actor')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('table.action')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('table.model')}</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">{t('table.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-primary">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-20 text-center text-gray-500 animate-pulse font-mono text-xs uppercase tracking-widest">Decrypting audit trail...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center text-gray-500 italic">No system events recorded.</td></tr>
                ) : logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className={cn(
                      "hover:bg-white/[0.04] transition-all cursor-pointer",
                      expandedId === log.id && "bg-white/[0.04]"
                    )} onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-gray-500" />
                          <div>
                            <p className="text-sm font-bold text-white">{formatDateSafe(log.timestamp, 'HH:mm:ss')}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{formatDateSafe(log.timestamp, 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {log.actor_name ? String(log.actor_name)[0] : 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{String(log.actor_name || 'System Auto')}</p>
                            <p className="text-[10px] text-gray-600 font-mono tracking-tighter">{log.ip_address || '0.0.0.0'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border",
                          log.action_type === 'CREATE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          log.action_type === 'UPDATE' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Database size={14} className="text-gray-600" />
                          <span className="font-mono">{log.model_name}</span>
                          <span className="text-xs text-gray-600 font-bold tracking-tighter audit-log-identifier">
                            {getIdentifier(log)}
                          </span>
                          <span className="sr-only">#{log.object_id}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="text-gray-500 hover:text-white transition-colors">
                          {expandedId === log.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable Diff View */}
                    <AnimatePresence>
                      {expandedId === log.id && (
                        <tr key={`${log.id}-details`}>
                          <td colSpan={5} className="p-0 border-t-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-black/40"
                            >
                              <div className="p-8 space-y-4">
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Detailed Change Diff</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {Object.entries(log.changed_fields || {}).map(([field, data]: [string, any]) => (
                                    <div key={field} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">{field.replace('_', ' ')}</p>
                                      {typeof data === 'object' && data !== null && data.old !== undefined ? (
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-red-400 line-through bg-red-400/10 px-2 py-1 rounded-md">{String(data.old || 'None')}</span>
                                          <ChevronRight size={14} className="text-gray-600" />
                                          <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">{String(data.new || 'None')}</span>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-white sans-serif truncate">{typeof data === 'string' ? data : JSON.stringify(data)}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
