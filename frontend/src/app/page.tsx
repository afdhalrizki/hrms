'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const stats = [
  { 
    name: 'Total Employees', 
    value: '1,284', 
    change: '+12%', 
    trend: 'up', 
    icon: Users,
    color: 'bg-blue-500/10 text-blue-500'
  },
  { 
    name: 'Today Attendance', 
    value: '954', 
    change: '92%', 
    trend: 'up', 
    icon: UserCheck,
    color: 'bg-emerald-500/10 text-emerald-500'
  },
  { 
    name: 'Pending Leaves', 
    value: '12', 
    change: '-2', 
    trend: 'down', 
    icon: Clock,
    color: 'bg-orange-500/10 text-orange-500'
  },
  { 
    name: 'New Hires (Month)', 
    value: '24', 
    change: '+3', 
    trend: 'up', 
    icon: UserPlus,
    color: 'bg-purple-500/10 text-purple-500'
  },
];

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            Welcome back, Admin 👋
          </motion.h1>
          <p className="text-muted-foreground">
            Here's what's happening in your company today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 rounded-3xl border shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl", stat.color)}>
                  <stat.icon size={24} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                  stat.trend === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-4xl font-bold tracking-tighter group-hover:scale-105 transition-transform origin-left">
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Cards / Recent Activity Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 glass-card rounded-3xl p-8 min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold">Attendance Trends</h2>
              <div className="flex gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">REALTIME</span>
              </div>
            </div>
            
            {/* Visual Placeholder for a chart */}
            <div className="w-full h-64 bg-primary/5 rounded-2xl flex items-center justify-center border border-dashed border-primary/20">
              <div className="flex flex-col items-center gap-4">
                <TrendingUp size={48} className="text-primary/40 animate-pulse" />
                <p className="text-sm text-muted-foreground italic">Interactive charts integration pending...</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="glass-card rounded-3xl p-8 flex flex-col gap-6"
          >
            <h2 className="text-xl font-bold">Recent Hires</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Employee {i}</p>
                    <p className="text-xs text-muted-foreground">Joined 2 days ago</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
