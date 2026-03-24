'use client';

import React, { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Clock, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Coffee,
  Sun,
  Moon,
  Sunset
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface Shift {
  id?: number;
  name: string;
  start_time: string;
  end_time: string;
  break_duration_mins: number;
  color?: string; // We can add these for frontend styling
  icon_name?: string;
}

const ICON_MAP: Record<string, any> = {
  Sun,
  Sunset,
  Moon,
  Clock,
};

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const [formData, setFormData] = useState<Shift>({
    name: '',
    start_time: '08:00',
    end_time: '17:00',
    break_duration_mins: 60,
  });

  const fetchShifts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/shifts');
      setShifts(data);
    } catch (error) {
      toast.error('Failed to fetch shifts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShift?.id) {
        await apiFetch(`/shifts/${editingShift.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('Shift updated successfully');
      } else {
        await apiFetch('/shifts', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Shift created successfully');
      }
      setIsModalOpen(false);
      setEditingShift(null);
      fetchShifts();
    } catch (error) {
      toast.error('Failed to save shift');
    }
  };

  const handleDeleteShift = async (id: number) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    try {
      await apiFetch(`/shifts/${id}`, { method: 'DELETE' });
      toast.success('Shift deleted successfully');
      fetchShifts();
    } catch (error) {
      toast.error('Failed to delete shift');
    }
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_duration_mins: shift.break_duration_mins,
    });
    setIsModalOpen(true);
  };

  const filteredShifts = shifts.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Shift Master Data</h1>
            <p className="text-sm text-gray-400">Manage work hour definitions and break durations.</p>
          </div>
          <button 
            onClick={() => {
              setEditingShift(null);
              setFormData({ name: '', start_time: '08:00', end_time: '17:00', break_duration_mins: 60 });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Plus size={18} />
            Create New Shift
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search shifts..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Shift Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredShifts.map((shift, index) => (
              <motion.div
                key={shift.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 rounded-3xl border border-white/10 relative group hover:border-primary/30 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-3 rounded-2xl bg-white/5", shift.color || 'text-primary')}>
                    {React.createElement(ICON_MAP[shift.icon_name || 'Clock'] || Clock, { size: 24 })}
                  </div>
                  <button className="p-2 rounded-lg text-gray-500 hover:bg-white/10">
                    <MoreVertical size={18} />
                  </button>
                </div>

                <div className="space-y-1 mb-6">
                  <h3 className="font-bold text-lg text-white">{shift.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-primary" />
                      {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Coffee size={14} className="text-orange-400" />
                      {shift.break_duration_mins}m Break
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(shift)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => shift.id && handleDeleteShift(shift.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Decorative background pulse */}
                <div className="absolute inset-0 bg-primary/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-6">
                {editingShift ? 'Edit Shift' : 'Create New Shift'}
              </h2>
              <form onSubmit={handleSaveShift} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Shift Name</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Morning Shift"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Start Time</label>
                    <input 
                      type="time"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                      value={formData.start_time}
                      onChange={e => setFormData({...formData, start_time: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">End Time</label>
                    <input 
                      type="time"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                      value={formData.end_time}
                      onChange={e => setFormData({...formData, end_time: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Break (Minutes)</label>
                  <input 
                    type="number"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formData.break_duration_mins}
                    onChange={e => setFormData({...formData, break_duration_mins: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/20 transition-colors"
                  >
                    {editingShift ? 'Update Shift' : 'Create Shift'}
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
