'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Shield, 
  Camera, 
  Upload,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch, getBaseUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const t = useTranslations('Profile');
  const tCommon = useTranslations('Common');
  const { user } = useAuth();
  
  const [profile, setProfile] = React.useState<any>(null);
  const [receiveEmail, setReceiveEmail] = React.useState(user?.receive_email_notifications ?? true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const fetchProfile = React.useCallback(async () => {
    if (!user?.employee_id) return;
    try {
      setIsLoading(true);
      const data = await apiFetch(`/employees/${user.employee_id}`);
      setProfile(data);
    } catch (error: any) {
      console.error('Profile fetch error:', error);
      toast.error(error.message || 'Failed to load profile data');
      // If fetch fails, we should still stop loading so the user isn't stuck
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.employee_id]);

  React.useEffect(() => {
    fetchProfile();
    if (user) {
      setReceiveEmail(user.receive_email_notifications);
    }
  }, [fetchProfile, user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    try {
      setIsSaving(true);
      await apiFetch(`/employees/${profile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          phone: profile.phone,
          address: profile.address,
          ptkp_status: profile.ptkp_status,
          ktp_number: profile.ktp_number,
          npwp_number: profile.npwp_number,
        })
      });

      // Update User Preferences if changed
      if (user && receiveEmail !== user.receive_email_notifications) {
        await apiFetch(`/users/${user.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            receive_email_notifications: receiveEmail
          })
        });
      }

      toast.success(t('success'));
    } catch (error: any) {
      toast.error(error.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (field: 'ktp_image' | 'npwp_image' | 'face_reference', file: File) => {
    if (!profile) return;
    
    const formData = new FormData();
    formData.append(field, file);
    
    try {
      toast.loading(t('form.uploading'), { id: 'upload' });
      const updated = await apiFetch(`/employees/${profile.id}`, {
        method: 'PATCH',
        body: formData,
        // apiFetch handles multipart if body is FormData
      });
      setProfile(updated);
      toast.success('Document uploaded successfully', { id: 'upload' });
    } catch (error: any) {
      toast.error(error.message || 'Upload failed', { id: 'upload' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse font-medium">{tCommon('loading')}</p>
        </div>
      </DashboardLayout>
    );
  }

  const getMediaUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${getBaseUrl().replace('/api', '')}${path}`;
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Summary */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-8 rounded-3xl border border-white/10 text-center relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="relative inline-block mx-auto mb-6">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-1 border border-white/20">
                    <div className="h-full w-full rounded-full bg-accent flex items-center justify-center text-4xl font-bold text-white overflow-hidden shadow-2xl">
                      {profile?.face_reference ? (
                        <img src={getMediaUrl(profile.face_reference)!} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User size={48} />
                      )}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    className="absolute bottom-0 right-0 h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border-4 border-black/20 hover:scale-110 transition-transform"
                    title="Change Photo"
                  >
                    <Camera size={18} />
                  </button>
                  <input 
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload('face_reference', e.target.files[0])}
                  />
                </div>
                
                <h2 className="text-xl font-bold text-white mb-1">{profile?.fullname}</h2>
                <p className="text-sm font-medium text-primary mb-4">{profile?.role_name}</p>
                
                <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <Shield size={14} className="text-emerald-500" />
                    <span>NIK: {profile?.nik}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <Calendar size={14} className="text-blue-500" />
                    <span>Joined: {profile?.join_date}</span>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 h-40 w-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
            </motion.div>

            {/* Employment Summary */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-3xl border border-white/10 space-y-4"
            >
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={14} />
                {t('sections.employment')}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase">Department</p>
                  <p className="text-sm text-white font-medium">{profile?.department_name || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase">Supervisor</p>
                  <p className="text-sm text-white font-medium">{profile?.supervisor_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-600 uppercase">Status</p>
                  <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/20">
                    {profile?.status}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Edit Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Details */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 rounded-3xl border border-white/10 space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <h3 className="text-lg font-bold text-white">{t('sections.contact')}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('form.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="email" 
                      value={profile?.email || ''}
                      disabled
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('form.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                    <input 
                      type="text" 
                      value={profile?.phone || ''}
                      onChange={(e) => profile && setProfile({...profile, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                      placeholder="+62..."
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('form.address')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-primary" size={18} />
                    <textarea 
                      rows={3}
                      value={profile?.address || ''}
                      onChange={(e) => profile && setProfile({...profile, address: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium resize-none"
                      placeholder="Write your home address..."
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Preferences Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-8 rounded-3xl border border-white/10 space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <h3 className="text-lg font-bold text-white">{t('sections.preferences')}</h3>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{t('form.notifications')}</p>
                  <p className="text-xs text-gray-500">Enable or disable operational email alerts.</p>
                </div>
                <button
                  type="button"
                  aria-label={t('form.notifications')}
                  onClick={() => setReceiveEmail(!receiveEmail)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    receiveEmail ? "bg-primary" : "bg-white/10"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      receiveEmail ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </motion.div>

            {/* Documents */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8 rounded-3xl border border-white/10 space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <h3 className="text-lg font-bold text-white">{t('sections.documents')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* ID Numbers */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('form.ktp')}</label>
                    <input 
                      type="text" 
                      value={profile?.ktp_number || ''}
                      onChange={(e) => profile && setProfile({...profile, ktp_number: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('form.npwp')}</label>
                    <input 
                      type="text" 
                      value={profile?.npwp_number || ''}
                      onChange={(e) => profile && setProfile({...profile, npwp_number: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('form.ptkp')}</label>
                    <select 
                      value={profile?.ptkp_status || 'TK/0'}
                      onChange={(e) => profile && setProfile({...profile, ptkp_status: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium appearance-none"
                    >
                      <option value="TK/0">TK/0: Single, No dependents</option>
                      <option value="TK/1">TK/1: Single, 1 dependent</option>
                      <option value="TK/2">TK/2: Single, 2 dependents</option>
                      <option value="TK/3">TK/3: Single, 3 dependents</option>
                      <option value="K/0">K/0: Married, No dependents</option>
                      <option value="K/1">K/1: Married, 1 dependent</option>
                      <option value="K/2">K/2: Married, 2 dependents</option>
                      <option value="K/3">K/3: Married, 3 dependents</option>
                    </select>
                  </div>
                </div>

                {/* Scans */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="ktp-upload" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('form.ktpImage')}</label>
                    <div 
                      className="relative h-40 rounded-3xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-all group overflow-hidden cursor-pointer"
                      onClick={() => document.getElementById('ktp-upload')?.click()}
                    >
                      {profile?.ktp_image ? (
                        <div className="h-full w-full relative">
                          <img src={getMediaUrl(profile.ktp_image)!} alt="KTP Scan" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="text-white" size={24} />
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-gray-500">
                          <Upload size={24} />
                          <span className="text-xs">Click to upload KTP</span>
                        </div>
                      )}
                      <input 
                        id="ktp-upload" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('ktp_image', e.target.files[0])}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="npwp-upload" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">{t('form.npwpImage')}</label>
                    <div 
                      className="relative h-40 rounded-3xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-all group overflow-hidden cursor-pointer"
                      onClick={() => document.getElementById('npwp-upload')?.click()}
                    >
                      {profile?.npwp_image ? (
                        <div className="h-full w-full relative">
                          <img src={getMediaUrl(profile.npwp_image)!} alt="NPWP Scan" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="text-white" size={24} />
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-gray-500">
                          <Upload size={24} />
                          <span className="text-xs">Click to upload NPWP</span>
                        </div>
                      )}
                      <input 
                        id="npwp-upload" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('npwp_image', e.target.files[0])}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={isSaving}
                className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all flex items-center gap-3"
              >
                {isSaving ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={20} />
                )}
                {tCommon('save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
