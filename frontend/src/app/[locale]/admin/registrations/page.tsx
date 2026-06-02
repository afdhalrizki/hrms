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
  Filter,
  AlertCircle,
  Settings,
  Save
} from 'lucide-react';
import { apiFetch, getDomainSuffix } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

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
  const { user, loading: authLoading } = useAuth();

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailsText, setEmailsText] = useState('');
  const [defaultEmails, setDefaultEmails] = useState<string[]>([]);
  const [isUsingDefault, setIsUsingDefault] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchNotificationEmails = async () => {
    try {
      const data = await apiFetch('/internal/registrations/notification-emails');
      setEmailsText(data.emails || '');
      setDefaultEmails(data.default_emails || []);
      setIsUsingDefault(data.is_using_default);
    } catch (error) {
      console.error('Failed to fetch notification emails:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const data = await apiFetch('/internal/registrations/set-notification-emails', {
        method: 'POST',
        body: JSON.stringify({ emails: emailsText })
      });
      setIsUsingDefault(!emailsText.trim());
      toast.success('Notification emails updated successfully');
      setShowSettingsModal(false);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchRequests = async (signal?: AbortSignal) => {
    try {
      const data = await apiFetch('/internal/registrations', { signal });
      setRequests(data);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      const controller = new AbortController();
      fetchRequests(controller.signal);
      fetchNotificationEmails();
      return () => controller.abort();
    }
  }, [authLoading, user]);

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

  const isAuthorized = user && (
    user.global_role === 'SUPERADMIN' || 
    user.global_role === 'ONBOARDING_AGENT' || 
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
            <button 
              onClick={() => {
                fetchNotificationEmails();
                setShowSettingsModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all font-bold text-sm text-muted-foreground hover:text-white"
            >
              <Settings size={18} className="text-primary animate-hover-spin" />
              <span>Email Settings</span>
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
                            {request.subdomain_prefix}.{getDomainSuffix()}
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

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-lg rounded-[2.5rem] border border-white/10 overflow-hidden bg-zinc-900/90 text-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="text-primary animate-hover-spin" size={24} />
                    <h2 className="text-xl font-bold">Notification Email Settings</h2>
                  </div>
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  Configure dynamic destination emails for registration notifications.
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recipient Emails</label>
                  <textarea
                    rows={3}
                    value={emailsText}
                    onChange={(e) => setEmailsText(e.target.value)}
                    placeholder="e.g. harikerja.hrms@gmail.com, admin@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm placeholder:text-muted-foreground font-semibold resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Separate multiple emails with commas. If left empty, notifications will go to the authorized global admins.
                  </p>
                </div>

                {/* Default emails info banner */}
                <div className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      isUsingDefault ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
                    )} />
                    <span className="text-muted-foreground uppercase tracking-wider">
                      Mode: {isUsingDefault ? "Default Global Admins" : "Custom Recipient List"}
                    </span>
                  </div>
                  {isUsingDefault && defaultEmails.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        Authorized Global Admins:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {defaultEmails.map((email) => (
                          <span 
                            key={email} 
                            className="text-[10px] font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300"
                          >
                            {email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-5 border-t border-white/5 bg-white/[0.01] flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/95 text-white transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  {savingSettings ? (
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
