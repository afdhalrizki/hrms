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
  ChevronDown,
  X,
  Loader2,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface Employee {
  id: number;
  nik: string;
  fullname: string;
  email: string;
  phone: string;
  status: string;
  department_name: string;
  role_name: string;
  access_role_name: string;
  golongan_name: string;
  join_date: string;
}

interface DropdownItem {
  id: number;
  name: string;
}

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data for Selects
  const [departments, setDepartments] = useState<DropdownItem[]>([]);
  const [roles, setRoles] = useState<DropdownItem[]>([]);
  const [accessRoles, setAccessRoles] = useState<DropdownItem[]>([]);
  const [golongans, setGolongans] = useState<DropdownItem[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    nik: '',
    fullname: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    golongan: '',
    access_role: '',
    status: 'PERMANENT',
    join_date: new Date().toISOString().split('T')[0],
    ktp_number: '',
    ptkp_status: 'TK/0',
    create_user: true, 
    is_admin: false,
  });

  useEffect(() => {
    fetchEmployees();
    fetchDropdownData();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch('employees');
      setEmployees(data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const depts = await apiFetch('departments');
      setDepartments(depts);
      const rls = await apiFetch('roles');
      setRoles(rls);
      const gols = await apiFetch('golongan');
      setGolongans(gols);
      const accRoles = await apiFetch('access-roles');
      setAccessRoles(accRoles);
    } catch (error) {
      console.error("Failed to fetch dropdowns:", error);
    }
  };

  const calculateStatusColor = (status: string) => {
    switch (status) {
      case 'PERMANENT': return "bg-emerald-500/10 text-emerald-500";
      case 'PROBATION': return "bg-orange-500/10 text-orange-500";
      case 'CONTRACT': return "bg-blue-500/10 text-blue-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('employees', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      await fetchEmployees(); // Refresh list
      setIsAddModalOpen(false); // Close Modal
      toast.success("Employee provisioned successfully");
      
      // Reset Form
      setFormData(prev => ({
        ...prev,
        nik: '', fullname: '', email: '', phone: '', ktp_number: '', is_admin: false
      }));
    } catch (error: any) {
      console.error("Failed to create employee:", error);
      toast.error(error.message || "Error creating employee. Please check inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
            <p className="text-sm text-muted-foreground">Manage your workforce and provisioning options.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95"
          >
            <UserPlus size={18} />
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
        </div>

        {/* Table */}
        <div className="glass-card rounded-3xl border overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex justify-center items-center gap-3">
                        <Loader2 className="animate-spin text-primary" size={24} />
                        Loading employee data...
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      No employees found matching your criteria.
                    </td>
                  </tr>
                ) : filteredEmployees.map((emp, index) => (
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
                          {emp.fullname.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{emp.fullname}</p>
                          <p className="text-xs text-muted-foreground">{emp.nik} • {emp.role_name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <ShieldCheck size={10} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">{emp.access_role_name || 'No Role'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {emp.department_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider",
                        calculateStatusColor(emp.status)
                      )}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2"><Mail size={12}/> {emp.email}</span>
                        <span className="flex items-center gap-2"><Phone size={12}/> {emp.phone || '-'}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative p-6 glass-card border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-6 space-y-1">
                <h2 className="text-xl font-bold">Provision New Employee</h2>
                <p className="text-sm text-muted-foreground">Create a new employee profile and setup their access rights.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Personal Info */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <input required type="text" name="fullname" value={formData.fullname} onChange={handleInputChange} className="w-full px-4 py-2 border bg-white/5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employee ID (NIK)</label>
                    <input required type="text" name="nik" value={formData.nik} onChange={handleInputChange} className="w-full px-4 py-2 border bg-white/5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 border bg-white/5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 border bg-white/5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ID Card (KTP)</label>
                    <input required type="text" name="ktp_number" value={formData.ktp_number} onChange={handleInputChange} className="w-full px-4 py-2 border bg-white/5 rounded-xl text-sm" />
                  </div>

                  {/* Organization Info */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <select required name="department" value={formData.department} onChange={handleInputChange} className="w-full px-4 py-2 border bg-white/5 rounded-xl text-sm appearance-none">
                      <option value="" className="bg-background text-foreground">Select Dept</option>
                      {departments.map(d => <option key={d.id} value={d.id} className="bg-background text-foreground">{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <select required name="role" value={formData.role} onChange={handleInputChange} className="w-full px-4 py-2 border bg-white/5 rounded-xl text-sm appearance-none">
                      <option value="" className="bg-background text-foreground">Select Role</option>
                      {roles.map(r => <option key={r.id} value={r.id} className="bg-background text-foreground">{r.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Grade (Golongan)</label>
                    <select required name="golongan" value={formData.golongan} onChange={handleInputChange} className="w-full px-4 py-2 border bg-white/5 rounded-xl text-sm appearance-none">
                      <option value="" className="bg-background text-foreground">Select Grade</option>
                      {golongans.map(g => <option key={g.id} value={g.id} className="bg-background text-foreground">{g.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="my-6 border-t border-white/10" />

                {/* Account Provisioning Toggles */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary"/> Access Provisioning
                  </h3>

                  <label className="flex items-center justify-between p-4 bg-white/5 border rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="space-y-1 pr-4">
                      <p className="text-sm font-bold text-foreground">Create User Login</p>
                      <p className="text-xs text-muted-foreground">Provisions an authentication account so the employee can log into the Mobile ESS App using their email.</p>
                    </div>
                    <div className="relative">
                      <input type="checkbox" name="create_user" className="sr-only" checked={formData.create_user} onChange={handleInputChange} />
                      <div className={cn("block w-10 h-6 rounded-full transition-colors", formData.create_user ? "bg-primary" : "bg-white/20")}></div>
                      <div className={cn("absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", formData.create_user ? "translate-x-4" : "")}></div>
                    </div>
                  </label>

                  {formData.create_user && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Assign RBAC Access Role</label>
                        <select 
                          required 
                          name="access_role" 
                          value={formData.access_role} 
                          onChange={handleInputChange} 
                          className="w-full px-4 py-3 border bg-white/5 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        >
                          <option value="" className="bg-background">Select Access Level</option>
                          {accessRoles.map(r => (
                            <option key={r.id} value={r.id} className="bg-background">
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-muted-foreground">Standardized permissions for this employee's account.</p>
                      </div>

                      <label className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl cursor-pointer hover:bg-primary/10 transition-colors">
                        <div className="space-y-1 pr-4">
                          <p className="text-sm font-bold text-primary">Grant Tenant Admin Privileges</p>
                          <p className="text-xs text-muted-foreground">Warning: Automatically promotes this account to Tenant Admin (is_staff). They will have full access to view and edit company data on this dashboard.</p>
                        </div>
                        <div className="relative">
                          <input type="checkbox" name="is_admin" className="sr-only" checked={formData.is_admin} onChange={handleInputChange} />
                          <div className={cn("block w-10 h-6 rounded-full transition-colors", formData.is_admin ? "bg-primary" : "bg-white/20")}></div>
                          <div className={cn("absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", formData.is_admin ? "translate-x-4" : "")}></div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Provision Employee
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
