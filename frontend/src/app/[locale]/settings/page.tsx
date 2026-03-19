'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTenant } from '@/context/TenantContext';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Upload, 
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  ChevronRight,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/api';

export default function SettingsPage() {
  const { tenantName, address: initialAddress, phone: initialPhone, logo: initialLogo } = useTenant();
  
  const [name, setName] = useState(tenantName || '');
  const [address, setAddress] = useState(initialAddress || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogo ? `${getBaseUrl().replace('/api', '')}${initialLogo}` : null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Sync state when context mounts/updates
  useEffect(() => {
    if (tenantName) setName(tenantName);
    if (initialAddress) setAddress(initialAddress);
    if (initialPhone) setPhone(initialPhone);
    if (initialLogo) {
       // Support relative paths from backend
       setLogoPreview(initialLogo.startsWith('http') ? initialLogo : `${getBaseUrl().replace('/api', '')}${initialLogo}`);
    }
  }, [tenantName, initialAddress, initialPhone, initialLogo]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('address', address);
      formData.append('phone', phone);
      if (selectedFile) {
        formData.append('logo', selectedFile);
      }

      const res = await fetch(`${getBaseUrl()}/tenant/settings/`, {
        method: 'PATCH',
        body: formData,
        // FormData automatically sets correct Content-Type boundary
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update settings');
      }

      setMessage({ type: 'success', text: 'Company profile updated successfully. The page will reload to reflect changes.' });
      
      // Force reload to update TenantContext globally
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            Company Profile Settings
          </motion.h1>
          <p className="text-muted-foreground mt-2">
            Customize how your brand appears across the HRMS portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-3xl p-8 border shadow-sm h-full"
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Logo Upload Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 size={20} className="text-primary" />
                    Company Branding
                  </h3>
                  
                  <div className="flex items-start gap-8">
                    <div className="flex-shrink-0">
                      <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center bg-white/5 overflow-hidden relative group">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                        ) : (
                          <Building2 size={40} className="text-muted-foreground/50" />
                        )}
                        
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Upload size={24} className="text-white mb-2" />
                          <span className="text-xs font-semibold text-white">Upload Logo</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileSelect}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-grow space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Company Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-foreground"
                          placeholder="e.g. PT Maju Bersama"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended logo format: PNG or SVG with a transparent background. Max size: 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border-white/10" />

                {/* Contact Details Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin size={20} className="text-primary" />
                    Contact Details
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Phone size={14} className="text-muted-foreground" />
                        Business Phone
                      </label>
                      <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                        placeholder="e.g. +62 21 1234 5678"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Headquarters Address</label>
                      <textarea 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground resize-none"
                        placeholder="Street address, City, ZIP Code..."
                      />
                    </div>
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Save Profile
                  </button>
                </div>

              </form>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card border rounded-3xl p-8 space-y-6 shadow-sm"
            >
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Shield size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Access Management</h3>
                <p className="text-sm text-muted-foreground">
                  Role-Based Access Control (RBAC). Define which employees can manage HR, Attendance, or Payroll.
                </p>
              </div>
              <Link 
                href="/settings/roles"
                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-semibold group"
              >
                Manage Roles
                <ChevronRight className="transition-transform group-hover:translate-x-1" size={18} />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card border rounded-3xl p-8 space-y-6 shadow-sm opacity-50 grayscale pointer-events-none"
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Lock size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Two-Factor Auth</h3>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your admin accounts. (Coming Soon)
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
