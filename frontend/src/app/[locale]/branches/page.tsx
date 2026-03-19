'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { Branch } from '@/types/core';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Globe, 
  Navigation,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await apiFetch('/branches/');
      setBranches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name'),
      address: formData.get('address'),
      latitude: parseFloat(formData.get('latitude') as string),
      longitude: parseFloat(formData.get('longitude') as string),
      radius_meters: parseInt(formData.get('radius_meters') as string),
      timezone: formData.get('timezone'),
    };

    try {
      if (editingBranch) {
        await apiFetch(`/branches/${editingBranch.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/branches/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchBranches();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    try {
      await apiFetch(`/branches/${id}/`, { method: 'DELETE' });
      fetchBranches();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
            <p className="text-muted-foreground mt-1">Manage office locations and geofencing parameters.</p>
          </div>
          <button 
            onClick={() => { setEditingBranch(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            Add Branch
          </button>
        </div>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input 
              type="text"
              placeholder="Search branches by name or address..."
              className="w-full pl-12 pr-4 py-3 glass-card rounded-2xl border bg-white/5 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="glass-card rounded-2xl p-4 border flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Total Branches</span>
            <span className="text-2xl font-bold">{branches.length}</span>
          </div>
        </div>

        {/* Branch List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-muted-foreground animate-pulse">Loading location data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredBranches.map((branch) => (
                <motion.div
                  key={branch.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card group rounded-3xl p-6 border relative overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button 
                      onClick={() => { setEditingBranch(branch); setIsModalOpen(true); }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteBranch(branch.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <MapPin size={24} />
                  </div>

                  <h3 className="text-xl font-bold mb-2">{branch.name}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-6 h-10">
                    {branch.address}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-sm">
                      <Navigation size={14} className="text-primary" />
                      <span className="text-muted-foreground">Radius:</span>
                      <span className="font-semibold text-foreground">{branch.radius_meters}m</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe size={14} className="text-primary" />
                      <span className="text-muted-foreground">Timezone:</span>
                      <span className="font-semibold text-foreground">{branch.timezone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 italic pt-1">
                      <span>{branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBranches.length === 0 && (
          <div className="text-center py-20 glass-card rounded-3xl border border-dashed">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
              <MapPin size={32} />
            </div>
            <h3 className="text-xl font-semibold">No branches found</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
              Start by adding your first office location to enable geofencing features.
            </p>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="glass-card w-full max-w-lg rounded-[2.5rem] border bg-card p-8 relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h2>
                  <p className="text-sm text-muted-foreground">Configure location and geofence settings.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Branch Name</label>
                  <input 
                    name="name"
                    required
                    defaultValue={editingBranch?.name}
                    className="w-full px-4 py-3 glass-card rounded-2xl border bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="e.g. Jakarta Head Office"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Address</label>
                  <textarea 
                    name="address"
                    required
                    rows={2}
                    defaultValue={editingBranch?.address}
                    className="w-full px-4 py-3 glass-card rounded-2xl border bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    placeholder="Full street address..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Latitude</label>
                    <input 
                      name="latitude"
                      type="number"
                      step="any"
                      required
                      defaultValue={editingBranch?.latitude}
                      className="w-full px-4 py-3 glass-card rounded-2xl border bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="-6.2088"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Longitude</label>
                    <input 
                      name="longitude"
                      type="number"
                      step="any"
                      required
                      defaultValue={editingBranch?.longitude}
                      className="w-full px-4 py-3 glass-card rounded-2xl border bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="106.8456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Radius (Meters)</label>
                    <input 
                      name="radius_meters"
                      type="number"
                      required
                      defaultValue={editingBranch?.radius_meters || 100}
                      className="w-full px-4 py-3 glass-card rounded-2xl border bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Timezone</label>
                    <select 
                      name="timezone"
                      defaultValue={editingBranch?.timezone || 'Asia/Jakarta'}
                      className="w-full px-4 py-3 glass-card rounded-2xl border bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                    >
                      <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                      <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                      <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-2xl border font-semibold hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 py-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {formLoading && <Loader2 className="animate-spin" size={20} />}
                    {editingBranch ? 'Save Changes' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
