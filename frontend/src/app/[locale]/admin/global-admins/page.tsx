'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  ShieldCheck, 
  Search,
  Mail,
  User as UserIcon,
  Plus,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface GlobalAdmin {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  global_role: string;
  tenants?: number[];
  tenant_details?: { id: number; name: string; schema_name: string }[];
}

interface Tenant {
  id: number;
  name: string;
  schema_name: string;
}

export default function GlobalAdminsPage() {
  const [admins, setAdmins] = useState<GlobalAdmin[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAdmin, setSelectedAdmin] = useState<GlobalAdmin | null>(null);
  const [formData, setFormData] = useState<{
    email: string;
    first_name: string;
    last_name: string;
    global_role: string;
    password?: string;
    tenants: number[];
  }>({
    email: '',
    first_name: '',
    last_name: '',
    global_role: 'SUPERADMIN',
    password: '',
    tenants: []
  });
  const [submitting, setSubmitting] = useState(false);
  const { user, loading: authLoading } = useAuth();

  const fetchAdmins = async (signal?: AbortSignal) => {
    try {
      const data = await apiFetch('/internal/global-admins/', { signal });
      setAdmins(data);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Failed to fetch global admins:', error);
      toast.error('Failed to load global admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const data = await apiFetch('/internal/tenants/');
      setTenants(data);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      if (user.global_role !== 'SUPERADMIN') {
        toast.error('Unauthorized access');
        return;
      }
      const controller = new AbortController();
      fetchAdmins(controller.signal);
      fetchTenants();
      return () => controller.abort();
    }
  }, [authLoading, user]);

  const handleOpenModal = (mode: 'create' | 'edit', admin?: GlobalAdmin) => {
    setModalMode(mode);
    if (mode === 'edit' && admin) {
      setSelectedAdmin(admin);
      setFormData({
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        global_role: admin.global_role,
        password: '', // empty password means do not change
        tenants: admin.tenants || []
      });
    } else {
      setSelectedAdmin(null);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        global_role: 'SUPERADMIN',
        password: '',
        tenants: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (payload.global_role !== 'SUPPORT_AGENT') {
        payload.tenants = [];
      }
      if (modalMode === 'edit' && !payload.password) {
        delete (payload as any).password;
      }

      if (modalMode === 'create') {
        await apiFetch('/internal/global-admins/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Global admin created successfully');
      } else if (modalMode === 'edit' && selectedAdmin) {
        await apiFetch(`/internal/global-admins/${selectedAdmin.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        toast.success('Global admin updated successfully');
      }
      setIsModalOpen(false);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this global admin?')) return;
    
    try {
      await apiFetch(`/internal/global-admins/${id}/`, {
        method: 'DELETE'
      });
      toast.success('Global admin deleted successfully');
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete global admin');
    }
  };

  if (!authLoading && user && user.global_role !== 'SUPERADMIN') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <AlertCircle size={48} className="text-red-500" />
          <h2 className="text-2xl font-bold">Unauthorized</h2>
          <p className="text-muted-foreground">Only SUPERADMIN can access this page.</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Global Admins</h1>
            <p className="text-muted-foreground font-medium">
              Manage platform-level administrators and their roles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleOpenModal('create')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={18} />
              Add Admin
            </button>
          </div>
        </div>

        {/* Admins Table */}
        <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin User</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Global Role</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-muted-foreground italic">
                      Loading admins...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-muted-foreground italic">
                      No global admins found.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <motion.tr 
                      key={admin.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                            <UserIcon size={18} />
                          </div>
                          <div>
                            <p className="font-bold">{admin.first_name} {admin.last_name}</p>
                            <p className="text-xs text-muted-foreground">ID: #{admin.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-muted-foreground" />
                          <span className="text-sm">{admin.email}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 w-max">
                            <ShieldCheck size={12} /> {admin.global_role}
                          </div>
                          {admin.global_role === 'SUPPORT_AGENT' && admin.tenant_details && admin.tenant_details.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate" title={admin.tenant_details.map(t => t.name).join(', ')}>
                              <span className="font-semibold text-white/70">Tenants:</span> {admin.tenant_details.map(t => t.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal('edit', admin)}
                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          {admin.id === user?.id ? (
                            <button 
                              className="p-2 rounded-lg text-muted-foreground/30 cursor-not-allowed"
                              title="Cannot delete your own account"
                              disabled
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleDelete(admin.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
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

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-[2rem] w-full max-w-md border border-white/10 p-8 shadow-2xl relative"
            >
              <h2 className="text-2xl font-bold mb-6">
                {modalMode === 'create' ? 'Add Global Admin' : 'Edit Global Admin'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">First Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Last Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Role</label>
                  <select 
                    value={formData.global_role}
                    onChange={e => setFormData({...formData, global_role: e.target.value})}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                  >
                    <option value="SUPERADMIN">Super Administrator</option>
                    <option value="ONBOARDING_AGENT">Onboarding & Sales</option>
                    <option value="SUPPORT_AGENT">Customer Support</option>
                    <option value="BILLING_ADMIN">Billing & Finance</option>
                  </select>
                </div>
                {formData.global_role === 'SUPPORT_AGENT' && (
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Assign Tenants
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-white/10 rounded-xl p-3 bg-white/5 space-y-2">
                      {tenants.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No tenants available</p>
                      ) : (
                        tenants.map(tenant => {
                          const isChecked = formData.tenants.includes(tenant.id);
                          return (
                            <label key={tenant.id} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const newTenants = isChecked
                                    ? formData.tenants.filter(id => id !== tenant.id)
                                    : [...formData.tenants, tenant.id];
                                  setFormData({ ...formData, tenants: newTenants });
                                }}
                                className="rounded bg-white/10 border-white/10 text-primary focus:ring-primary/50"
                              />
                              <span>{tenant.name} <span className="text-xs text-muted-foreground">({tenant.schema_name})</span></span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Password {modalMode === 'edit' && '(Leave blank to keep unchanged)'}
                  </label>
                  <input 
                    type="password" 
                    required={modalMode === 'create'}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-bold hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
