'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  ClipboardList, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  Building2,
  Mail,
  ExternalLink,
  MoreVertical,
  Filter
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RegistrationRequest {
  id: number;
  company_name: string;
  subdomain_prefix: string;
  admin_email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export default function RegistrationsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      const data = await apiFetch('/internal/registrations');
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await apiFetch(`/internal/registrations/${id}/${action}`, {
        method: 'POST',
      });
      // Refresh list
      fetchRequests();
      toast.success(`Registration ${action}d successfully`);
    } catch (error: any) {
      console.error(`[E2E_DEBUG] Action failed for ${action}:`, error);
      alert(`Action failed: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20">
            <Clock size={12} /> PENDING
          </div>
        );
      case 'APPROVED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
            <CheckCircle2 size={12} /> APPROVED
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
            <XCircle size={12} /> REJECTED
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Registration Requests</h1>
            <p className="text-muted-foreground font-medium">
              Review and manage new company onboarding requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder="Search companies..."
                className="bg-white/5 border border-white/10 rounded-2xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm w-64"
              />
            </div>
            <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Requests', value: requests.length, icon: ClipboardList, color: 'text-blue-500' },
            { label: 'Pending Approval', value: requests.filter(r => r.status === 'PENDING').length, icon: Clock, color: 'text-orange-500' },
            { label: 'Recently Approved', value: requests.filter(r => r.status === 'APPROVED').length, icon: CheckCircle2, color: 'text-emerald-500' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-6 rounded-[2rem] border border-white/5 flex items-center gap-4">
              <div className={cn("p-4 rounded-2xl bg-white/5", stat.color)}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Requests Table */}
        <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Company Details</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Domain</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin User</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground italic">
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground italic">
                      No registration requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <motion.tr 
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="font-bold">{request.company_name}</p>
                            <p className="text-xs text-muted-foreground">ID: #{request.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5">
                          <code className="text-sm bg-white/5 px-2 py-0.5 rounded border border-white/5 text-blue-400">
                            {request.subdomain_prefix}.harikerja.com
                          </code>
                          <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-muted-foreground" />
                          <span className="text-sm">{request.admin_email}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-8 py-5 text-right">
                        {request.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleAction(request.id, 'reject')}
                              disabled={actionLoading !== null}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => handleAction(request.id, 'approve')}
                              disabled={actionLoading !== null}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex items-center gap-2"
                            >
                              {actionLoading === request.id ? (
                                <div className="h-3 w-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                              ) : 'Approve'}
                            </button>
                          </div>
                        ) : (
                          <button className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
                            <MoreVertical size={18} />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
