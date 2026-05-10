'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  ShieldAlert, 
  ArrowLeft,
  Clock,
  CalendarDays,
  UserX,
  AlertTriangle,
  FileSearch
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';

interface AttendanceLog {
  id: number;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  biometric_skipped: boolean;
  verification_method: string;
}

export default function AttendanceAuditPage() {
  const t = useTranslations('Attendance');
  const [logs, setLogs] = React.useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user, loading: authLoading } = useAuth();

  const fetchAuditLogs = React.useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch specifically skipped biometric records
      const data = await apiFetch('/attendance?biometric_skipped=true');
      setLogs(data);
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && user) {
      fetchAuditLogs();
    }
  }, [fetchAuditLogs, authLoading, user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <a href="/attendance" className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={16} />
              </a>
              <h1 className="text-2xl font-bold tracking-tight text-white">Biometric Audit Log</h1>
            </div>
            <p className="text-sm text-gray-400">Monitoring attendance records performed without biometric verification.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchAuditLogs}
              className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <FileSearch size={18} />
              Refresh Log
            </button>
          </div>
        </div>

        {/* Audit Warning Note */}
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4"
        >
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Administrative Notice</h4>
                <p className="text-xs text-amber-500/80 leading-relaxed">
                    The records below were captured while the <strong>Biometric Requirement</strong> was disabled (Emergency Fallback). 
                    Please cross-verify these entries with branch supervisors to ensure on-site presence integrity.
                </p>
            </div>
        </motion.div>

        {/* Audit Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Skipped Records</p>
                    <ShieldAlert size={16} className="text-amber-500" />
                </div>
                <p className="text-3xl font-bold text-white">{logs.length}</p>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-full" />
                </div>
            </div>
            
            <div className="glass-card p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Verification Status</p>
                    <UserX size={16} className="text-red-500" />
                </div>
                <p className="text-3xl font-bold text-white">Manual</p>
                <p className="text-[10px] text-gray-400">All records bypassed AI Face Matching</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Period Coverage</p>
                    <CalendarDays size={16} className="text-primary" />
                </div>
                <p className="text-3xl font-bold text-white">Latest</p>
                <p className="text-[10px] text-gray-400">Showing all records with audit flags</p>
            </div>
        </div>

        {/* Audit Table */}
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden bg-white/5">
          <div className="p-6 border-b border-white/10">
            <h2 className="font-bold text-white uppercase tracking-widest text-xs">Skipped Biometric Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Check In</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 uppercase tracking-widest text-xs font-bold">
                      Loading audit database...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 uppercase tracking-widest text-xs font-bold">
                      No records found with bypassed biometrics
                    </td>
                  </tr>
                ) : logs.map((log, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    key={log.id} 
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/20 flex items-center justify-center font-bold text-amber-500 text-xs">
                          {log.employee_name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-white">{log.employee_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {log.date}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Clock size={14} className="text-gray-500" />
                        {log.check_in || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider",
                        log.status === 'PRESENT' ? "bg-emerald-500/10 text-emerald-500" : 
                        log.status === 'LATE' ? "bg-orange-500/10 text-orange-500" : 
                        "bg-red-500/10 text-red-500"
                      )}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                             <div className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-500 uppercase">
                                Biometric Skipped (Emergency)
                             </div>
                        </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
