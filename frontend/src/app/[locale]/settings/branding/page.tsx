'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Palette, 
  Upload, 
  Image as ImageIcon, 
  Settings2, 
  Check, 
  Loader2,
  Eye
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function BrandingPage() {
  const t = useTranslations('Branding');
  const tCommon = useTranslations('Common');
  const tenant = useTenant();
  
  const [logo, setLogo] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(tenant.logo || null);
  const [primaryColor, setPrimaryColor] = React.useState(tenant.themePrimaryColor || '#6366f1');
  const [secondaryColor, setSecondaryColor] = React.useState(tenant.themeSecondaryColor || '#4f46e5');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        const userData = await apiFetch('/users/me');
        // Strictly check for ADMIN role, ignoring is_staff (which managers have for portal login)
        setIsAdmin(userData.role === 'ADMIN');
      } catch (error) {
        console.error('Failed to check branding access');
      } finally {
        setIsLoading(false);
      }
    };
    checkAccess();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (logo) formData.append('logo', logo);
      formData.append('theme_primary_color', primaryColor);
      formData.append('theme_secondary_color', secondaryColor);

      await apiFetch('/tenant/settings', {
        method: 'PATCH',
        body: formData,
      });
      
      toast.success(t('success'));
    } catch (error) {
      toast.error('Failed to update branding');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center px-4">
          <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
            <Palette size={40} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Restricted Access</h1>
          <p className="text-gray-500 max-w-sm mx-auto font-medium">
            You do not have the required permissions to access Corporate Branding settings. 
            Please contact your system administrator.
          </p>
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
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Palette className="text-primary" size={32} />
              {t('title')}
            </h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Settings Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="glass-card p-8 rounded-[40px] border border-white/10 bg-white/[0.02] space-y-8 shadow-2xl">
              
              {/* Logo Upload */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} />
                  {t('logo')}
                </label>
                <div className="flex items-center gap-8">
                  <div className="h-32 w-32 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Logo Preview" className="h-full w-full object-contain p-4" />
                    ) : (
                      <ImageIcon className="text-gray-700" size={40} />
                    )}
                    <input 
                      type="file" 
                      onChange={handleLogoChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="text-white" size={24} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Upload Brand Mark</p>
                    <p className="text-xs text-gray-500 max-w-[200px]">SVG, PNG or JPG (recommended 256x256px, max 2MB)</p>
                  </div>
                </div>
              </div>

              {/* Color Tunnels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {t('primaryColor')}
                  </label>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 rounded-lg bg-transparent border-none cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="bg-transparent text-sm font-mono text-white focus:outline-none w-20"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                    {t('secondaryColor')}
                  </label>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <input 
                      type="color" 
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-10 rounded-lg bg-transparent border-none cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="bg-transparent text-sm font-mono text-white focus:outline-none w-20"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : t('updateBtn')}
              </button>
            </div>
          </form>

          {/* Preview Pane */}
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2 px-4">
              <Eye size={22} className="text-primary" />
              {t('previewTitle')}
            </h2>
            
            <div className="glass-card rounded-[48px] border border-white/10 p-2 bg-slate-950 shadow-3xl overflow-hidden min-h-[500px] relative">
              {/* Mock Sidebar */}
              <div className="absolute left-0 top-0 bottom-0 w-16 border-r border-white/5 flex flex-col items-center py-6 gap-6">
                 <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                    {previewUrl ? <img src={previewUrl} className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 rounded-md bg-primary/20" />}
                 </div>
                 <div className="h-8 w-8 rounded-full bg-primary" />
                 <div className="h-8 w-8 rounded-full bg-white/5" />
                 <div className="h-8 w-8 rounded-full bg-white/5" />
              </div>
              
              {/* Mock Content */}
              <div className="ml-16 p-8 space-y-6">
                <div className="h-6 w-32 bg-white/10 rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/5 p-4 space-y-3">
                     <div className="h-8 w-8 rounded-xl bg-primary/20" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                        <ImageIcon size={16} className="m-2" />
                     </div>
                     <div className="h-4 w-20 bg-white/5 rounded-full" />
                  </div>
                  <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/5" />
                </div>
                <div className="h-12 w-full rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-xs font-bold text-white uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>
                   Action Button
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
