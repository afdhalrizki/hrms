'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Briefcase, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';

export default function LoginPage() {
  const { tenantName } = useTenant();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px]"
      >
        <div className="glass-card rounded-[2.5rem] border p-10 shadow-2xl space-y-8">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-primary items-center justify-center text-white shadow-xl shadow-primary/30 mx-auto mb-2">
              <Briefcase size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">HRMS Login</h1>
            <p className="text-sm text-muted-foreground">
              Welcome to <span className="text-primary font-bold">{tenantName}</span> portal
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 rounded-2xl border border-transparent focus:border-primary/30 focus:bg-white/10 focus:outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 rounded-2xl border border-transparent focus:border-primary/30 focus:bg-white/10 focus:outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 accent-primary" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
              </label>
              <button className="text-sm font-semibold text-primary hover:underline underline-offset-4">Forgot password?</button>
            </div>

            <button className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              Sign In
              <ArrowRight size={20} />
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account? <span className="text-primary font-bold cursor-pointer hover:underline">Contact HR</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
