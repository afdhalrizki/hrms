'use client';

import React, { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MoreHorizontal,
  User,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import { format, startOfWeek, addDays, startOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface Employee {
  id: number;
  fullname: string;
  department_name: string;
  role_name: string;
}

interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  color?: string;
  text?: string;
}

interface Schedule {
  id?: number;
  employee: number;
  shift: number;
  date: string;
}

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{employeeId: number, date: string} | null>(null);
  const { user, loading: authLoading } = useAuth();

  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [empData, shiftData, scheduleData] = await Promise.all([
        apiFetch('/employees'),
        apiFetch('/shifts'),
        apiFetch(`/schedules?start_date=${format(weekDays[0], 'yyyy-MM-dd')}&end_date=${format(weekDays[6], 'yyyy-MM-dd')}`)
      ]);
      setEmployees(empData);
      setShifts(shiftData);
      setSchedules(scheduleData);
    } catch (error) {
      toast.error('Failed to load scheduling data');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  React.useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [currentDate, fetchData, authLoading, user]);

  const getShiftForEmployeeAndDate = (employeeId: number, date: string) => {
    const sch = schedules.find(s => s.employee === employeeId && s.date === date);
    if (!sch) return null;
    return shifts.find(s => s.id === sch.shift);
  };

  const handleAssignShift = async (shiftId: number | null) => {
    if (!selectedCell) return;
    
    try {
      const existing = schedules.find(s => s.employee === selectedCell.employeeId && s.date === selectedCell.date);
      
      if (shiftId === null) {
        if (existing?.id) {
          await apiFetch(`/schedules/${existing.id}`, { method: 'DELETE' });
        }
      } else {
        const body = {
          employee: selectedCell.employeeId,
          shift: shiftId,
          date: selectedCell.date
        };
        
        if (existing?.id) {
          await apiFetch(`/schedules/${existing.id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
          });
        } else {
          await apiFetch('/schedules', {
            method: 'POST',
            body: JSON.stringify(body),
          });
        }
      }
      
      toast.success('Schedule updated');
      setIsAssignModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Employee Scheduling</h1>
            <p className="text-sm text-gray-400">Assign shifts and manage officer rotations.</p>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-sm">
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 text-sm font-bold text-white uppercase tracking-wide min-w-[200px] text-center">
              {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
            </span>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2">
            <Plus size={18} />
            Auto-Generate Schedule
          </button>
          <button className="px-4 py-2 glass-card border border-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-colors">
            Copy from Last Week
          </button>
        </div>

        {/* Schedule Grid */}
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest min-w-[200px]">Employee</th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="px-4 py-6 text-center min-w-[120px]">
                      <span className="block text-xs font-medium text-gray-500 uppercase mb-1">{format(day, 'EEE')}</span>
                      <span className="text-lg font-black text-white">{format(day, 'd')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center font-bold text-primary">
                          {emp.fullname.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{emp.fullname}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{emp.role_name}</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((date) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const shift = getShiftForEmployeeAndDate(emp.id, dateStr);
                      
                      return (
                        <td key={dateStr} className="px-3 py-4">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedCell({ employeeId: emp.id, date: dateStr });
                              setIsAssignModalOpen(true);
                            }}
                            className={cn(
                              "w-full p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all min-h-[60px]",
                              shift 
                                ? "bg-primary/10 border-primary/20" 
                                : "bg-white/5 border-white/5 border-dashed hover:border-white/20"
                            )}
                          >
                            {shift ? (
                              <>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest text-primary")}>
                                  {shift.name}
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium">
                                  {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                </span>
                              </>
                            ) : (
                              <Plus size={14} className="text-gray-600" />
                            )}
                          </motion.button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assign Shift Modal */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card w-full max-w-sm p-8 rounded-3xl border border-white/10 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-2">Assign Shift</h2>
              <p className="text-sm text-gray-400 mb-6 font-medium">
                {selectedCell && format(new Date(selectedCell.date), 'EEEE, MMM d')}
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleAssignShift(null)}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors flex justify-between items-center"
                >
                  <span>Off Day</span>
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                </button>
                
                {shifts.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleAssignShift(s.id)}
                    className="w-full p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm hover:bg-primary/20 transition-all flex justify-between items-center"
                  >
                    <span>{s.name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})</span>
                    <Clock size={16} />
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="w-full mt-6 py-3 text-sm font-bold text-gray-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
