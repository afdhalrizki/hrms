'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { Instagram, Linkedin, Facebook, Youtube, Mail, MapPin, Phone } from 'lucide-react';
import { getSupportEmail } from '@/lib/api';
import { useTranslations } from 'next-intl';

export const PublicFooter = () => {
  const t = useTranslations('PublicFooter');
  const tNav = useTranslations('PublicNav');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-white/5 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
                HK
              </div>
              <span className="text-xl font-black tracking-tighter">HariKerja <span className="text-primary">HRMS</span></span>
            </Link>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t('desc')}
            </p>
            <div className="flex gap-4">
              <a href="#" className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all group">
                <Linkedin size={22} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all group">
                <Instagram size={22} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all group">
                <Facebook size={22} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all group">
                <Youtube size={22} className="group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-8 uppercase tracking-widest text-primary/80">{t('product')}</h4>
            <ul className="space-y-5">
              <li><Link href="/" className="text-muted-foreground hover:text-white transition-colors text-lg">{tNav('home')}</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-white transition-colors text-lg">{tNav('about')}</Link></li>
              <li><Link href="/signup" className="text-muted-foreground hover:text-white transition-colors text-lg">{tNav('getStarted')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-8 uppercase tracking-widest text-primary/80">{t('features')}</h4>
            <ul className="space-y-5">
              <li className="text-muted-foreground text-lg">Core HR Management</li>
              <li className="text-muted-foreground text-lg">Attendance (GPS & Photo)</li>
              <li className="text-muted-foreground text-lg">Payroll (PPh 21 / BPJS)</li>
              <li className="text-muted-foreground text-lg">Performance (KPI)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-8 uppercase tracking-widest text-primary/80">{t('contact')}</h4>
            <ul className="space-y-5">
              <li className="flex items-center gap-4 text-muted-foreground text-lg">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-primary" />
                </div>
                <span>{t('address')}</span>
              </li>
              <li className="flex items-center gap-4 text-muted-foreground text-lg">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone size={20} className="text-primary" />
                </div>
                <span>+62 21 1234 5678</span>
              </li>
              <li className="flex items-center gap-4 text-muted-foreground text-lg">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail size={20} className="text-primary" />
                </div>
                <span className="truncate">{getSupportEmail()}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-base text-muted-foreground">
          <p>© {currentYear} HariKerja HRMS. All rights reserved.</p>
          <div className="flex gap-10">
            <a href="#" className="hover:text-white transition-colors">{t('privacy')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
