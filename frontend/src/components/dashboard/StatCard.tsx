import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  name: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
  color: string;
  index: number;
}

// --- Sub-component: CountUp Number ---
function AnimatedNumber({ value }: { value: string | number }) {
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : value;
  const isDecimal = typeof value === 'string' && value.includes('.');
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = numericValue;
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
  }, [numericValue]);

  return <>{displayValue.toLocaleString()}</>;
}

export default function StatCard({ name, value, change, trend, icon: Icon, color, index }: StatCardProps) {
  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-60, 60], [10, -10]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-60, 60], [-10, 10]), { stiffness: 300, damping: 30 });

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

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6, type: "spring" }}
      className="glass-card p-6 rounded-[2rem] border border-white/10 shadow-lg hover:shadow-2xl transition-all group relative overflow-hidden backdrop-blur-xl"
    >
      {/* Background Mesh Glow specific to color category */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-current opacity-[0.03] group-hover:opacity-[0.07] transition-opacity blur-3xl rounded-full" style={{ color: color.split(' ')[1] }} />
      
      <div className="flex items-center justify-between mb-4 relative z-10" style={{ transform: "translateZ(30px)" }}>
        <div className={cn("p-4 rounded-2xl relative overflow-hidden", color)}>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Icon size={24} className="relative z-10" />
        </div>
        
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full border",
          trend === 'up' 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
        )}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </div>
      </div>

      <div className="space-y-1 relative z-10" style={{ transform: "translateZ(50px)" }}>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{name}</p>
        <h4 className="text-4xl font-black tracking-tighter flex items-baseline gap-1">
          <AnimatedNumber value={value} />
          <span className="text-xs font-normal text-muted-foreground tracking-normal">units</span>
        </h4>
      </div>

      {/* Interactive Bottom Glow */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: color.split(' ')[1] }} />
    </motion.div>
  );
}
