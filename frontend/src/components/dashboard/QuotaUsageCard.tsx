import React, { useState, useEffect } from 'react';
import { useTenant } from '@/context/TenantContext';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { HardDrive, Users, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// --- Sub-component: CountUp Number ---
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

export default function QuotaUsageCard() {
  const router = useRouter();
  const { 
    storageUsedBytes, 
    totalStorageCapacityMb, 
    employeeCount, 
    totalEmployeeCapacity,
    planType,
    isLoading 
  } = useTenant();

  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), { stiffness: 300, damping: 30 });

  function handleMouseMove(event: React.MouseEvent) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  if (isLoading) return null;

  // Storage Logic
  const usedMb = (storageUsedBytes || 0) / (1024 * 1024);
  const totalMb = totalStorageCapacityMb || 100;
  const storagePercent = Math.min((usedMb / totalMb) * 100, 100);

  // Employee Logic
  const usedEmployees = employeeCount || 0;
  const totalEmployees = totalEmployeeCapacity || 10;
  const employeePercent = Math.min((usedEmployees / totalEmployees) * 100, 100);

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 shadow-[0_0_15px_rgba(244,63,94,0.5)]";
    if (percent >= 80) return "bg-gradient-to-r from-orange-400 via-amber-500 to-orange-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]";
    return "bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
  };

  const formatMb = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 20 }}
      className="glass-card rounded-[2.5rem] p-8 flex flex-col gap-6 relative overflow-hidden group border border-white/20 shadow-2xl backdrop-blur-3xl"
    >
      {/* Dynamic Mesh Background */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      <div className="flex items-center justify-between relative z-10" style={{ transform: "translateZ(40px)" }}>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
          >
            <Zap className="text-primary fill-primary/20" size={24} />
          </motion.div>
          System Quota
        </h3>
        <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20">
          {planType} EDITION
        </span>
      </div>

      <div className="space-y-8 relative z-10" style={{ transform: "translateZ(20px)" }}>
        {/* Storage Progress */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-3 text-sm font-bold">
              <div className="p-2 rounded-xl bg-muted/50">
                <HardDrive size={18} className="text-primary" />
              </div>
              <span>Cloud Storage</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Usage</p>
              <p className="text-lg font-black tracking-tighter">
                {formatMb(usedMb)} <span className="text-muted-foreground font-normal text-xs">/ {formatMb(totalMb)}</span>
              </p>
            </div>
          </div>
          <div className="h-3 w-full bg-black/10 dark:bg-white/5 rounded-full p-0.5 overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${storagePercent}%` }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              className={cn("h-full rounded-full relative", getProgressColor(storagePercent))}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            </motion.div>
          </div>
          <AnimatePresence>
            {storagePercent >= 90 && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-rose-500 flex items-center gap-1 font-black uppercase tracking-widest"
              >
                <AlertTriangle size={12} className="animate-bounce" /> Danger: Limit Reached
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Employee Progress */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-3 text-sm font-bold">
              <div className="p-2 rounded-xl bg-muted/50">
                <Users size={18} className="text-primary" />
              </div>
              <span>Workforce Capacity</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Seats</p>
              <p className="text-lg font-black tracking-tighter">
                <AnimatedNumber value={usedEmployees} /> <span className="text-muted-foreground font-normal text-xs">/ {totalEmployees}</span>
              </p>
            </div>
          </div>
          <div className="h-3 w-full bg-black/10 dark:bg-white/5 rounded-full p-0.5 overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${employeePercent}%` }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className={cn("h-full rounded-full relative", getProgressColor(employeePercent))}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            </motion.div>
          </div>
          <AnimatePresence>
            {employeePercent >= 90 && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-amber-500 flex items-center gap-1 font-black uppercase tracking-widest"
              >
                <AlertTriangle size={12} /> Optimization Required
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.button 
        style={{ transform: "translateZ(60px)" }}
        whileHover={{ scale: 1.05, translateY: -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/settings/billing')}
        className="mt-4 w-full py-5 rounded-3xl bg-primary text-white font-black text-sm shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_20px_50px_rgba(var(--primary-rgb),0.5)] transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <span className="relative z-10 tracking-widest uppercase">Manage Workspace</span>
        <Zap size={18} className="relative z-10 fill-white" />
      </motion.button>
    </motion.div>
  );
}
