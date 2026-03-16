'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  Mail,
  Phone,
  Building2,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Mock Data
const employees = [
  { id: 1, nik: 'EMP001', name: 'John Doe', email: 'john@example.com', role: 'Fullstack Developer', dept: 'Engineering', status: 'PERMANENT' },
  { id: 2, nik: 'EMP002', name: 'Jane Smith', email: 'jane@example.com', role: 'Product Manager', dept: 'Product', status: 'PROBATION' },
  { id: 3, nik: 'EMP003', name: 'Alice Johnson', email: 'alice@example.com', role: 'UI Designer', dept: 'Design', status: 'PERMANENT' },
  { id: 4, nik: 'EMP004', name: 'Bob Wilson', email: 'bob@example.com', role: 'HR Specialist', dept: 'HR', status: 'CONTRACT' },
];

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage your workforce, roles, and departments.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
            <Plus size={18} />
            <span>Add Employee</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, email, or NIK..."
              className="w-full pl-10 pr-4 py-2.5 glass-card rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl border text-sm font-medium hover:bg-white/5 transition-colors">
              <Filter size={18} className="text-muted-foreground" />
              Filter
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl border text-sm font-medium hover:bg-white/5 transition-colors">
              <Building2 size={18} className="text-muted-foreground" />
              Department
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Table / List */}
        <div className="glass-card rounded-3xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map((emp, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={emp.id} 
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm uppercase">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.nik} • {emp.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {emp.dept}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider",
                        emp.status === 'PERMANENT' ? "bg-emerald-500/10 text-emerald-500" : 
                        emp.status === 'PROBATION' ? "bg-orange-500/10 text-orange-500" : 
                        "bg-blue-500/10 text-blue-500"
                      )}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <div className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-primary transition-colors">
                          <Mail size={16} />
                        </div>
                        <div className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-primary transition-colors">
                          <Phone size={16} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-muted-foreground hover:bg-white/10 transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Placeholder */}
          <div className="p-4 border-t bg-white/5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Showing 1 to 4 of 1,284 entries</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 glass-card border rounded-lg text-xs font-medium opacity-50 cursor-not-allowed">Previous</button>
              <button className="px-3 py-1 glass-card border rounded-lg text-xs font-medium hover:bg-white/10 transition-all">Next</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
