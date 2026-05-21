'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Fingerprint, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  X, 
  Loader2, 
  Monitor, 
  MapPin, 
  Hash, 
  Activity, 
  Edit3,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface Branch {
  id: number;
  name: string;
}

interface FingerprintDevice {
  id: number;
  name: string;
  device_model: string;
  serial_number: string;
  branch: number | null;
  branch_name?: string;
  is_active: boolean;
  last_activity?: string;
}

export default function FingerprintDevicesPage() {
  const [devices, setDevices] = useState<FingerprintDevice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading: authLoading } = useAuth();
  
  // Edit State
  const [editingDevice, setEditingDevice] = useState<FingerprintDevice | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    device_model: '',
    serial_number: '',
    branch: '',
    is_active: true
  });

  // Import Logs State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleOpenImportModal = () => {
    setImportFile(null);
    setIsImportModalOpen(true);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }
    
    setIsImporting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', importFile);
      
      const response = await apiFetch('/fingerprint-devices/import-logs', {
        method: 'POST',
        body: formDataObj
      });
      
      toast.success(`Successfully processed ${response.received} rows. Inserted ${response.inserted} new logs.`);
      setIsImportModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to import logs');
    } finally {
      setIsImporting(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const devicesData = await apiFetch('/fingerprint-devices');
      setDevices(devicesData || []);
      const branchesData = await apiFetch('/branches');
      setBranches(branchesData || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load fingerprint devices or branches');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [fetchData, authLoading, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenAddModal = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      device_model: '',
      serial_number: '',
      branch: '',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (device: FingerprintDevice) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      device_model: device.device_model,
      serial_number: device.serial_number,
      branch: device.branch ? device.branch.toString() : '',
      is_active: device.is_active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        branch: formData.branch ? parseInt(formData.branch) : null
      };

      if (editingDevice) {
        await apiFetch(`/fingerprint-devices/${editingDevice.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Fingerprint device updated successfully');
      } else {
        await apiFetch('/fingerprint-devices', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Fingerprint device registered successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Error processing request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fingerprint device? This will stop logs synchronization from this device.')) return;
    
    try {
      await apiFetch(`/fingerprint-devices/${id}`, { method: 'DELETE' });
      toast.success('Device deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete device');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Fingerprint className="text-primary animate-pulse-subtle" size={32} />
              Fingerprint Devices
            </h1>
            <p className="text-muted-foreground">Daftar dan kelola integrasi mesin sidik jari biometrik fisik.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleOpenImportModal}
              data-testid="import-logs-btn"
              className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-bold transition-all flex items-center gap-2"
            >
              <Upload size={20} />
              Import Logs (Excel)
            </button>
            <button 
              onClick={handleOpenAddModal}
              data-testid="add-device-btn"
              className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Add Device
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-6 rounded-[24px] bg-gradient-to-r from-primary/10 to-accent/10 border border-white/5 flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Fingerprint Integration Setup</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">
              Untuk menghubungkan mesin sidik jari fisik Anda (misal. ZKTeco ADMS), daftarkan perangkat dengan serial number yang sesuai. 
              Gunakan API key dari halaman <strong>API Keys</strong> agar agen sinkronisasi lokal Anda dapat mengunggah log kehadiran ke endpoint <code>/api/attendance/device-logs/</code>.
            </p>
          </div>
        </div>

        {/* Devices List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-56 glass-card rounded-3xl animate-pulse bg-white/5 border border-white/10" />
              ))
            ) : devices.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-card border-dashed border-white/10 rounded-[32px]">
                <Fingerprint size={48} className="mx-auto text-gray-600 mb-4 opacity-20" />
                <p className="text-gray-500 italic font-medium">Belum ada mesin sidik jari terdaftar.</p>
              </div>
            ) : devices.map((device) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={device.id}
                data-testid="fingerprint-device-item"
                className="glass-card p-6 rounded-[32px] border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all relative group overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase",
                      device.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {device.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(device)}
                        data-testid={`edit-device-${device.id}`}
                        className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(device.id)}
                        data-testid={`delete-device-${device.id}`}
                        className="h-8 w-8 rounded-full hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight truncate" data-testid="device-item-name">{device.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                        <Monitor size={12} />
                        {device.device_model || 'Unknown Model'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 space-y-2 text-xs text-gray-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Hash size={12} /> Serial Number</span>
                        <span className="font-mono text-white font-semibold" data-testid="device-item-serial">{device.serial_number}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><MapPin size={12} /> Branch</span>
                        <span className="text-white font-medium">{device.branch_name || 'All Branches'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-500">
                  Last Activity: {device.last_activity ? new Date(device.last_activity).toLocaleString() : 'No connection yet'}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative p-6 glass-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl bg-slate-900/90"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-6 space-y-1">
                <h2 className="text-xl font-bold text-white" data-testid="modal-title">
                  {editingDevice ? 'Edit Fingerprint Device' : 'Register Fingerprint Device'}
                </h2>
                <p className="text-sm text-muted-foreground">Configure the physical hardware device attributes below.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Device Name *</label>
                  <input 
                    required 
                    type="text" 
                    name="name" 
                    data-testid="device-name-input"
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50" 
                    placeholder="e.g. Lobby Utama ZK"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Device Model</label>
                  <input 
                    type="text" 
                    name="device_model" 
                    data-testid="device-model-input"
                    value={formData.device_model} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50" 
                    placeholder="e.g. ZKTeco K40, UFace 800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Serial Number *</label>
                  <input 
                    required 
                    type="text" 
                    name="serial_number" 
                    data-testid="device-serial-input"
                    value={formData.serial_number} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" 
                    placeholder="e.g. ZK-SN-9999"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Branch Office</label>
                  <select 
                    name="branch" 
                    data-testid="device-branch-select"
                    value={formData.branch} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                  >
                    <option value="" className="bg-slate-900 text-white">All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white">{b.name}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <span className="text-sm font-semibold text-white">Device Status Active</span>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      data-testid="device-active-checkbox"
                      className="sr-only" 
                      checked={formData.is_active} 
                      onChange={handleInputChange} 
                    />
                    <div className={cn("block w-10 h-6 rounded-full transition-colors", formData.is_active ? "bg-primary" : "bg-white/20")}></div>
                    <div className={cn("absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", formData.is_active ? "translate-x-4" : "")}></div>
                  </div>
                </label>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    data-testid="submit-device-btn"
                    disabled={isSubmitting} 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {editingDevice ? 'Save Changes' : 'Register Device'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Logs Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsImportModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative p-6 glass-card border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl bg-slate-900/90"
            >
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-6 space-y-1">
                <h2 className="text-xl font-bold text-white" data-testid="import-modal-title">
                  Import Fingerprint Logs
                </h2>
                <p className="text-sm text-muted-foreground">Upload file Excel (.xlsx) hasil ekspor dari mesin absensi sidik jari Anda.</p>
              </div>

              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400">Select Excel File (.xlsx) *</label>
                  <div className="border-2 border-dashed border-white/15 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                    <input 
                      required
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setImportFile(file);
                      }}
                      data-testid="import-file-input"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-semibold text-white">
                      {importFile ? importFile.name : 'Click or drag file to upload'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Supports .xlsx and .xls formats</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1.5 text-xs text-gray-400">
                  <p className="font-semibold text-white mb-1">Panduan Kolom Excel:</p>
                  <p>1. <strong>biometric_pin</strong> atau <strong>pin</strong> (wajib): ID sidik jari karyawan.</p>
                  <p>2. <strong>timestamp</strong> atau <strong>time</strong> (wajib): Tanggal & waktu absensi.</p>
                  <p>3. <strong>in_out_state</strong> atau <strong>state</strong> (opsional): Status Masuk (IN) atau Keluar (OUT).</p>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsImportModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    data-testid="submit-import-btn"
                    disabled={isImporting || !importFile} 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isImporting && <Loader2 size={16} className="animate-spin" />}
                    Upload & Process
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
