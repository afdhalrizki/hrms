'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { Github, Twitter, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { getSupportEmail } from '@/lib/api';

export const PublicFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-glass-border pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl">
                HK
              </div>
              <span className="text-xl font-black tracking-tighter">HariKerja HRMS</span>
            </Link>
            <p className="text-muted-foreground leading-relaxed">
              Solusi manajemen SDM terintegrasi untuk bisnis modern di Indonesia. 
              Sesuai dengan standar TER 2024 dan BPJS.
            </p>
            <div className="flex gap-4">
              <a href="#" className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
                <Github size={20} />
              </a>
              <a href="#" className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
                <Twitter size={20} />
              </a>
              <a href="#" className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Product</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/pricelist" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/signup" className="text-muted-foreground hover:text-primary transition-colors">Registration</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Features</h4>
            <ul className="space-y-4">
              <li className="text-muted-foreground">Core HR Management</li>
              <li className="text-muted-foreground">Attendance (GPS & Photo)</li>
              <li className="text-muted-foreground">Payroll (PPh 21 / BPJS)</li>
              <li className="text-muted-foreground">Performance (KPI)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-muted-foreground">
                <MapPin size={18} className="text-primary" />
                <span>Jakarta, Indonesia</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone size={18} className="text-primary" />
                <span>+62 21 1234 5678</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail size={18} className="text-primary" />
                <span>{getSupportEmail()}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-glass-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {currentYear} HariKerja HRMS. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
