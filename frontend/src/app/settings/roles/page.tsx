'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Shield, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  Check,
  Search,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/api';

interface AccessRole {
  id: number;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  is_default: boolean;
}

const PERMISSION_KEYS = [
  { key: 'manage_hr', label: 'HR Management', description: 'Access to employees, departments, and roles.' },
  { key: 'manage_attendance', label: 'Attendance Management', description: 'Access to clock-in logs, leave requests, and schedules.' },
  { key: 'manage_payroll', label: 'Payroll Management', description: 'Access to salary components, periods, and payslips.' },
  { key: 'manage_settings', label: 'Settings Management', description: 'Access to company profile and system configurations.' },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<number | 'new' | null>(null);
  const [editForm, setEditForm] = useState<Partial<AccessRole>>({
    name: '',
    description: '',
    permissions: {}
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/access-roles/`);
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (role: AccessRole) => {
    setIsEditing(role.id);
    setEditForm({ ...role });
  };

  const startNew = () => {
    setIsEditing('new');
    setEditForm({
      name: '',
      description: '',
      permissions: {
        manage_hr: false,
        manage_attendance: false,
        manage_payroll: false,
        manage_settings: false
      }
    });
  };

  const handleTogglePerm = (key: string) => {
    setEditForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions?.[key]
      }
    }));
  };

  const handleSave = async () => {
    const isNew = isEditing === 'new';
    const method = isNew ? 'POST' : 'PATCH';
    const url = isNew ? `${getBaseUrl()}/access-roles/` : `${getBaseUrl()}/access-roles/${isEditing}/`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setIsEditing(null);
        fetchRoles();
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await fetch(`${getBaseUrl()}/access-roles/${id}/`, { method: 'DELETE' });
      fetchRoles();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Shield className="text-primary" />
                Roles & Permissions
              </h1>
              <p className="text-muted-foreground mt-1">
                Define access levels for your employees across all modules.
              </p>
            </div>
          </div>
          <button 
            onClick={startNew}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Create Custom Role
          </button>
        </div>

        {/* Roles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {roles.map((role) => (
              <motion.div
                key={role.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card border rounded-3xl p-6 flex flex-col h-full group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Shield size={24} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(role)}
                      className="p-2 hover:bg-white/5 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    {!role.is_default && (
                      <button 
                        onClick={() => handleDelete(role.id)}
                        className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold truncate">{role.name}</h3>
                    {role.is_default && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground">Default</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {role.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Permissions</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(role.permissions).filter(([_, v]) => v).length > 0 ? (
                      Object.entries(role.permissions).map(([k, v]) => v && (
                        <div key={k} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-semibold flex items-center gap-1">
                          <Check size={10} />
                          {PERMISSION_KEYS.find(p => p.key === k)?.label || k}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No access granted</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Edit/Create Dialog Overlay */}
        <AnimatePresence>
          {isEditing !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditing(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl glass-card border rounded-[2rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{isEditing === 'new' ? 'New Custom Role' : 'Edit Role'}</h2>
                      <p className="text-sm text-muted-foreground">Define role name and module access levels.</p>
                    </div>
                    <button onClick={() => setIsEditing(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Role Name</label>
                        <input 
                          type="text" 
                          value={editForm.name}
                          onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                          placeholder="e.g. Attendance Manager"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea 
                          value={editForm.description}
                          onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                          rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground resize-none"
                          placeholder="What is this role responsible for?"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Module Access</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {PERMISSION_KEYS.map((perm) => (
                          <div 
                            key={perm.key}
                            onClick={() => handleTogglePerm(perm.key)}
                            className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                              editForm.permissions?.[perm.key] 
                                ? "bg-emerald-500/10 border-emerald-500/30" 
                                : "bg-white/5 border-white/10 opacity-70 hover:opacity-100 hover:bg-white/10"
                            }`}
                          >
                            <div className="flex-1">
                              <p className="font-bold text-sm">{perm.label}</p>
                              <p className="text-[11px] text-muted-foreground">{perm.description}</p>
                            </div>
                            <div className={`h-6 w-11 rounded-full relative transition-colors ${editForm.permissions?.[perm.key] ? "bg-emerald-500" : "bg-white/20"}`}>
                              <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${editForm.permissions?.[perm.key] ? "translate-x-5" : ""}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button 
                      onClick={() => setIsEditing(null)}
                      className="px-6 py-2.5 rounded-xl font-semibold bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSave}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                      <Save size={18} />
                      Save Role
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
