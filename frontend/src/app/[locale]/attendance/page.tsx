'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  MapPin, 
  Clock, 
  CalendarDays,
  MoreVertical,
  CheckCircle2,
  UserX,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { CorrectionRequestModal } from '@/components/attendance/CorrectionRequestModal';
import { Attendance } from '@/types/core';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

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
  const t = useTranslations('Attendance');
  const [logs, setLogs] = React.useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [todayAttendance, setTodayAttendance] = React.useState<AttendanceLog | null>(null);
  const [selectedAttendance, setSelectedAttendance] = React.useState<Attendance | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { attendancePlatformPolicy } = useTenant();
  const { user, loading: authLoading } = useAuth();
  const isWebRestricted = attendancePlatformPolicy === 'MOBILE';

  const fetchLogs = React.useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const data = await apiFetch('/attendance');
      setLogs(data);

      // Use local date string (YYYY-MM-DD) instead of UTC to match server date.today()
      const today = new Date().toLocaleDateString('en-CA'); 
      const todayRecord = data.find((l: AttendanceLog) => l.date === today);
      setTodayAttendance(todayRecord || null);
    } catch (error) {
      toast.error('Failed to fetch attendance logs');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleClockAction = async () => {
    if (isWebRestricted) {
      toast.error('Clock-in is restricted to the mobile application only.');
      return;
    }

    setIsProcessing(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsProcessing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const today = new Date().toISOString().split('T')[0];
          const now = new Date();
          const time = now.toTimeString().split(' ')[0]; // Returns HH:mm:ss

          if (!todayAttendance) {
            // Check In
            const data = await apiFetch('/attendance', {
              method: 'POST',
              body: JSON.stringify({
                date: today,
                check_in: time,
                latitude_in: latitude.toFixed(6),
                longitude_in: longitude.toFixed(6),
                platform: 'web'
              })
            });
            toast.success(t('success'));
            setTodayAttendance(data);
          } else {
            // Check Out
            const data = await apiFetch(`/attendance/${todayAttendance.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                check_out: time,
                platform: 'web'
              })
            });
            toast.success(t('success'));
            setTodayAttendance(data);
          }
          fetchLogs();
        } catch (error: any) {
          toast.error(error.message || 'Action failed');
        } finally {
          setIsProcessing(false);
        }
      },
      (error) => {
        setIsProcessing(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('User denied the request for Geolocation.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('The request to get user location timed out.');
            break;
          default:
            toast.error('An unknown error occurred.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

    const handleExportSummary = async () => {
    const { apiDownload } = await import('@/lib/api');
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    try {
      await apiDownload(`/attendance/attendance/export_summary_pdf/?month=${month}&year=${year}`, `Attendance_Summary_${month}_${year}.pdf`);
      toast.success('Summary PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to download summary PDF');
    }
  };

  const handleExportIndividual = async () => {
    const { apiDownload } = await import('@/lib/api');
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    try {
      await apiDownload(`/attendance/attendance/download_pdf/?month=${month}&year=${year}`, `Attendance_Log_${month}_${year}.pdf`);
      toast.success('Your Attendance PDF downloaded successfully');
    } catch (error) {
      toast.error('Failed to download individual PDF');
    }
  };

  const handleExportCSV = async () => {
    const { apiDownload } = await import('@/lib/api');
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    try {
      await apiDownload(`/attendance/attendance/export_csv/?month=${month}&year=${year}`, `Attendance_Recap_${month}_${year}.csv`);
      toast.success('Attendance CSV downloaded successfully');
    } catch (error) {
      toast.error('Failed to download CSV');
    }
  };

  React.useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchLogs();
      } else {
        setIsLoading(false);
      }
    }
  }, [fetchLogs, user, authLoading]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">{t('title')}</h1>
            <p className="text-sm text-gray-400">{t('subtitle')}</p>
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
            <a href="/attendance/corrections" className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 text-white">
              <AlertCircle size={18} />
              Correction Requests
            </a>
            <a href="/attendance/audit" className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-2 text-amber-500">
              <ShieldAlert size={18} />
              Audit Log
            </a>
            <button 
              data-testid="clock-btn"
              onClick={handleClockAction}
              disabled={isProcessing || isWebRestricted || !!(todayAttendance && todayAttendance.check_out)}
              className={cn(
                "px-8 py-2 rounded-xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100",
                !todayAttendance ? "bg-primary text-white shadow-primary/20" : "bg-emerald-500 text-white shadow-emerald-500/20"
              )}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : isWebRestricted ? (
                'Mobile Only'
              ) : !todayAttendance ? (
                t('checkIn')
              ) : (
                t('checkOut')
              )}
            </button>
            <div className="flex gap-1">
              <button 
                onClick={handleExportIndividual}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-transform flex items-center gap-2"
              >
                PDF Log
              </button>
              <button 
                onClick={handleExportSummary}
                className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl font-medium hover:bg-primary/20 transition-transform flex items-center gap-2"
              >
                Summary PDF
              </button>
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl font-medium hover:bg-emerald-500/20 transition-transform flex items-center gap-2"
              >
                Excel Recap
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { 
              label: t('stats.successRate'), 
              value: `${logs.length > 0 ? Math.round((logs.filter(l => l.liveness_verified).length / logs.length) * 100) : 0}%`, 
              icon: CheckCircle2, 
              color: 'text-emerald-500' 
            },
            { 
              label: t('stats.lateCheckins'), 
              value: logs.filter(l => l.status === 'LATE').length.toString(), 
              icon: Clock, 
              color: 'text-orange-500' 
            },
            { 
              label: t('stats.manualEdits'), 
              value: logs.filter(l => l.verification_method === 'MANUAL').length.toString(), 
              icon: UserX, 
              color: 'text-red-500' 
            },
            { 
              label: t('stats.totalToday'), 
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
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{stat.label}</p>
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
                      <button 
                        onClick={() => {
                          setSelectedAttendance(log as unknown as Attendance);
                          setIsCorrectionModalOpen(true);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all",
                          process.env.NEXT_PUBLIC_E2E === 'true' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        Request Correction
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedAttendance && (
        <CorrectionRequestModal 
          isOpen={isCorrectionModalOpen}
          onClose={() => setIsCorrectionModalOpen(false)}
          attendance={selectedAttendance}
          onSuccess={fetchLogs}
        />
      )}
    </DashboardLayout>
  );
}
