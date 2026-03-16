'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  MapPin, 
  Clock, 
  CalendarDays,
  MoreVertical,
  CheckCircle2,
  UserX
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface AttendanceLog {
  id: number;
  employee_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  latitude_in?: string;
  longitude_in?: string;
  liveness_verified: boolean;
  verification_method: string;
}

export default function AttendancePage() {
  const [logs, setLogs] = React.useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchLogs = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/attendance/attendances/');
      setLogs(data);
    } catch (error) {
      toast.error('Failed to fetch attendance logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Attendance Analytics</h1>
            <p className="text-sm text-gray-400">Monitor daily check-ins, leaves, and overtime.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/attendance/shifts" className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 text-white">
              <Clock size={18} />
              Manage Shifts
            </a>
            <a href="/attendance/schedule" className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 text-white">
              <CalendarDays size={18} />
              Scheduling
            </a>
            <button className="px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
              Export Log
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { 
              label: 'Success Rate', 
              value: `${logs.length > 0 ? Math.round((logs.filter(l => l.liveness_verified).length / logs.length) * 100) : 0}%`, 
              icon: CheckCircle2, 
              color: 'text-emerald-500' 
            },
            { 
              label: 'Late Check-ins', 
              value: logs.filter(l => l.status === 'LATE').length.toString(), 
              icon: Clock, 
              color: 'text-orange-500' 
            },
            { 
              label: 'Manual Edits', 
              value: logs.filter(l => l.verification_method === 'MANUAL').length.toString(), 
              icon: UserX, 
              color: 'text-red-500' 
            },
            { 
              label: 'Total Today', 
              value: logs.length.toString(), 
              icon: CalendarDays, 
              color: 'text-blue-500' 
            },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-4 rounded-2xl border border-white/10 flex items-center gap-4 bg-white/5">
              <div className={cn("p-2 rounded-xl bg-white/5", stat.color)}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-tight">{stat.label}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <h2 className="font-bold text-white uppercase tracking-widest text-xs">Real-time Attendance Stream</h2>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Check In</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Check Out</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Verification</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 uppercase tracking-widest text-xs font-bold">
                      Loading attendance data...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 uppercase tracking-widest text-xs font-bold">
                      No attendance logs found
                    </td>
                  </tr>
                ) : logs.map((log, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.01 }}
                    key={log.id} 
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs">
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
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Clock size={14} className="text-gray-500" />
                        {log.check_out || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            log.liveness_verified ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"
                          )} />
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-white">
                            {log.verification_method}
                          </span>
                        </div>
                        {log.latitude_in && (
                          <div className="flex items-center gap-1 text-[9px] text-gray-500">
                            <MapPin size={10} />
                            GPS Verified
                          </div>
                        )}
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
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-gray-500 hover:bg-white/10 transition-colors">
                        <MoreVertical size={16} />
                      </button>
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
