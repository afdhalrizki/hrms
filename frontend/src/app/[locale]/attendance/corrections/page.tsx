'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft,
  Search,
  History,
  ShieldAlert
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { AttendanceCorrectionRequest } from '@/types/core';
import { CorrectionRequestList } from '@/components/attendance/CorrectionRequestList';
import { useAuth } from '@/context/AuthContext';

export default function AttendanceCorrectionsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState<AttendanceCorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  const fetchRequests = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/attendance-corrections');
      setRequests(data);
    } catch (error) {
      toast.error('Failed to fetch correction requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = requests.filter(r => 
    r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = user?.is_staff || false;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-4">
          <a 
            href="/attendance" 
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors group uppercase tracking-widest"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Attendance
          </a>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
                {isAdmin ? 'Correction Queue' : 'My Requests'}
              </h1>
              <p className="text-gray-400 font-medium">
                {isAdmin 
                  ? 'Manage and approve employee attendance adjustment requests.' 
                  : 'Track the status of your submitted time corrections.'}
              </p>
            </div>

            <div className="relative group min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search requests..."
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid for Admin */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6 rounded-[2rem] border border-white/10 bg-white/5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                <History size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pending Requests</p>
                <p className="text-2xl font-black text-white">{requests.filter(r => r.status === 'PENDING').length}</p>
              </div>
            </div>
            <div className="glass-card p-6 rounded-[2rem] border border-white/10 bg-white/5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <ShieldAlert size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Approved Today</p>
                <p className="text-2xl font-black text-white">{requests.filter(r => r.status === 'APPROVED').length}</p>
              </div>
            </div>
            <div className="glass-card p-6 rounded-[2rem] border border-white/10 bg-white/5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <History size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Processed</p>
                <p className="text-2xl font-black text-white">{requests.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Hydrating Correction Queue...</p>
            </div>
          ) : (
            <CorrectionRequestList 
              requests={filteredRequests} 
              isAdmin={isAdmin} 
              onAction={fetchRequests} 
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
