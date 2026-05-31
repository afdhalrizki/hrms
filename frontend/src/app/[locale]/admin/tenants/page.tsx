'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Building2, 
  Search, 
  Power, 
  PowerOff,
  Clock, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Lock,
  Loader2
} from 'lucide-react';
import { apiFetch, getDomainSuffix } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface Tenant {
  id: number;
  name: string;
  schema_name: string;
  subscription_status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  plan_type: string;
  expiry_date: string | null;
  created_on: string | null;
}

export default function TenantsManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { user, loading: authLoading } = useAuth();

  const fetchTenants = async (signal?: AbortSignal) => {
    try {
      const data = await apiFetch('/internal/tenants/', { signal });
      setTenants(data);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Failed to fetch tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      const controller = new AbortController();
      fetchTenants(controller.signal);
      return () => controller.abort();
    }
  }, [authLoading, user]);

  const handleToggleActive = async (id: number, currentStatus: string, name: string) => {
    const actionText = currentStatus === 'SUSPENDED' ? 'reactivate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionText} tenant "${name}"?`)) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await apiFetch(`/internal/tenants/${id}/toggle-active/`, {
        method: 'POST',
      });
      toast.success(res.message || `Tenant status updated successfully`);
      fetchTenants();
    } catch (error: any) {
      console.error('Action failed:', error);
      toast.error(error.message || `Failed to update tenant status`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 w-max">
            <CheckCircle2 size={12} /> ACTIVE
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20 w-max">
            <Clock size={12} /> EXPIRED
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 w-max">
            <AlertCircle size={12} /> SUSPENDED
          </span>
        );
      default:
        return null;
    }
  };

  const isAuthorized = user && (
    user.global_role === 'SUPERADMIN' || 
    user.global_role === 'SUPPORT_AGENT' || 
    user.global_role === 'BILLING_ADMIN' ||
    (!user.global_role && user.is_global_admin)
  );

  if (!authLoading && !isAuthorized) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <AlertCircle size={48} className="text-red-500" />
          <h2 className="text-2xl font-bold">Unauthorized</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.schema_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.subscription_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Tenant Workspaces</h1>
            <p className="text-muted-foreground font-medium">
              Monitor, activate, or suspend active client environments on the platform.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm w-64"
              />
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-2.5 rounded-2xl">
              <Filter size={16} className="text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold focus:outline-none text-white cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Workspaces', value: tenants.length, icon: Building2, color: 'text-blue-500' },
            { label: 'Active Status', value: tenants.filter(t => t.subscription_status === 'ACTIVE').length, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Expired Status', value: tenants.filter(t => t.subscription_status === 'EXPIRED').length, icon: Clock, color: 'text-amber-500' },
            { label: 'Suspended Access', value: tenants.filter(t => t.subscription_status === 'SUSPENDED').length, icon: AlertCircle, color: 'text-red-500' },
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

        {/* Workspaces Table */}
        <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Workspace Name</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Domain / Schema</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tier Plan</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Expiry Date</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground italic">
                      <Loader2 className="animate-spin mx-auto mb-2 text-primary" size={28} />
                      Loading workspaces...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground italic">
                      No tenant workspaces found.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="font-bold">{t.name}</p>
                            <p className="text-xs text-muted-foreground">ID: #{t.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5">
                          <code className="text-sm bg-white/5 px-2 py-0.5 rounded border border-white/5 text-blue-400">
                            {t.schema_name}.{getDomainSuffix()}
                          </code>
                          <a 
                            href={`https://${t.schema_name}.${getDomainSuffix()}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-white transition-colors"
                          >
                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                          </a>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-black uppercase bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-white/80">
                          {t.plan_type}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar size={14} />
                          <span>{t.expiry_date || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {getStatusBadge(t.subscription_status)}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {t.subscription_status === 'SUSPENDED' ? (
                            <button 
                              onClick={() => handleToggleActive(t.id, t.subscription_status, t.name)}
                              disabled={actionLoading !== null}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all flex items-center gap-1.5"
                            >
                              {actionLoading === t.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Power size={14} />
                              )}
                              Reactivate
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleToggleActive(t.id, t.subscription_status, t.name)}
                              disabled={actionLoading !== null}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1.5"
                            >
                              {actionLoading === t.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <PowerOff size={14} />
                              )}
                              Suspend
                            </button>
                          )}
                        </div>
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
