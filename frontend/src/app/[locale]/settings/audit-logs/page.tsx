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

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/audit-logs');
      setLogs(data || []);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            Live Tracking Active
          </div>
        </div>

        {/* Filters Placeholder */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-wrap gap-4 items-center">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filter by:</span>
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50">
            <option>All actions</option>
            <option>CREATE</option>
            <option>UPDATE</option>
            <option>DELETE</option>
          </select>
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50">
            <option>All models</option>
            <option>Employee</option>
            <option>Attendance</option>
            <option>Payroll</option>
          </select>
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
                            <p className="text-sm font-bold text-white">{format(new Date(log.timestamp), 'HH:mm:ss')}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{format(new Date(log.timestamp), 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {log.actor_name ? log.actor_name[0] : 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{log.actor_name || 'System Auto'}</p>
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
                          <span className="text-xs text-gray-600 font-bold tracking-tighter">#{log.object_id}</span>
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
                        <tr>
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
                                  {Object.entries(log.changed_fields).map(([field, data]: [string, any]) => (
                                    <div key={field} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">{field.replace('_', ' ')}</p>
                                      {typeof data === 'object' && data.old !== undefined ? (
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-red-400 line-through bg-red-400/10 px-2 py-1 rounded-md">{data.old || 'None'}</span>
                                          <ChevronRight size={14} className="text-gray-600" />
                                          <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">{data.new || 'None'}</span>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-white">{JSON.stringify(data)}</p>
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
