'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTenant } from '@/context/TenantContext';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Upload, 
  Lock,
  CreditCard,
  Banknote,
  Clock,
  Percent,
  Camera,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Save,
  Shield,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/api';

export default function SettingsPage() {
  const { 
    tenantName, 
    address: initialAddress, 
    phone: initialPhone, 
    logo: initialLogo,
    lateDeductionRate: initialLate,
    absenceDeductionRate: initialAbsence,
    jkkRate: initialJkk,
    reimbursementApprovalLevel: initialReimbursementLevel,
    isBiometricEnabled: initialBioEnabled
  } = useTenant();
  
  const [name, setName] = useState(tenantName || '');
  const [address, setAddress] = useState(initialAddress || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [lateDeductionRate, setLateDeductionRate] = useState(initialLate || 0);
  const [absenceDeductionRate, setAbsenceDeductionRate] = useState(initialAbsence || 0);
  const [jkkRate, setJkkRate] = useState(initialJkk || 0.0024);
  const [reimbursementLevel, setReimbursementLevel] = useState(initialReimbursementLevel || 'BOTH');
  const [isBioEnabled, setIsBioEnabled] = useState(initialBioEnabled !== false);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogo ? `${getBaseUrl().replace('/api', '')}${initialLogo}` : null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Sync state when context mounts/updates
  useEffect(() => {
    if (tenantName) setName(tenantName);
    if (initialAddress) setAddress(initialAddress);
    if (initialPhone) setPhone(initialPhone);
    if (initialLate !== undefined) setLateDeductionRate(initialLate);
    if (initialAbsence !== undefined) setAbsenceDeductionRate(initialAbsence);
    if (initialJkk !== undefined) setJkkRate(initialJkk);
    if (initialReimbursementLevel) setReimbursementLevel(initialReimbursementLevel);
    if (initialBioEnabled !== undefined) setIsBioEnabled(initialBioEnabled);
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
      formData.append('late_deduction_rate', lateDeductionRate.toString());
      formData.append('absence_deduction_rate', absenceDeductionRate.toString());
      formData.append('jkk_rate', jkkRate.toString());
      formData.append('reimbursement_approval_level', reimbursementLevel);
      formData.append('is_biometric_enabled', isBioEnabled.toString());
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
                
                <hr className="border-white/10" />

                {/* Attendance & Payroll Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Banknote size={20} className="text-primary" />
                    Attendance & Payroll Policies
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Clock size={14} className="text-muted-foreground" />
                        Late Deduction Rate (Rp)
                      </label>
                      <input 
                        type="number" 
                        value={lateDeductionRate}
                        onChange={(e) => setLateDeductionRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                        placeholder="e.g. 5000"
                      />
                      <p className="text-[10px] text-muted-foreground">Potongan harian setiap kali terlambat.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle size={14} className="text-muted-foreground" />
                        Absence Deduction Rate (Rp)
                      </label>
                      <input 
                        type="number" 
                        value={absenceDeductionRate}
                        onChange={(e) => setAbsenceDeductionRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                        placeholder="e.g. 100000"
                      />
                      <p className="text-[10px] text-muted-foreground">Potongan harian jika alpa (tanpa izin).</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Percent size={14} className="text-muted-foreground" />
                        JKK Rate (Decimal)
                      </label>
                      <input 
                        type="number" 
                        step="0.0001"
                        value={jkkRate}
                        onChange={(e) => setJkkRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                        placeholder="e.g. 0.0024"
                      />
                      <p className="text-[10px] text-muted-foreground">Tarif JKK BPJS (Standar: 0.0024).</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reimbursement Approval</label>
                      <select 
                        value={reimbursementLevel}
                        onChange={(e) => setReimbursementLevel(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground appearance-none"
                      >
                        <option value="SUPERVISOR" className="bg-slate-900">Only Supervisor</option>
                        <option value="HR" className="bg-slate-900">Only HR/Admin</option>
                        <option value="BOTH" className="bg-slate-900">Both (Sequential)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="border-white/10" />

                {/* Security & Biometrics Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ShieldCheck size={20} className="text-primary" />
                    Security & Biometrics
                  </h3>
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Camera size={18} className="text-muted-foreground" />
                          Require Photo Attendance
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Karyawan wajib mengambil foto saat absen (Biometrik). Menonaktifkan fitur ini akan melewati pengambilan foto jika penyimpanan Anda penuh.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsBioEnabled(!isBioEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isBioEnabled ? 'bg-primary' : 'bg-white/10'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBioEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
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

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card border rounded-3xl p-8 space-y-6 shadow-sm border-primary/20 bg-primary/5"
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <CreditCard size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Subscription & Billing</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your plan, view invoices, and update payment methods.
                </p>
              </div>
              <Link 
                href="/settings/billing"
                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all font-semibold group"
              >
                Manage Billing
                <ChevronRight className="transition-transform group-hover:translate-x-1" size={18} />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
