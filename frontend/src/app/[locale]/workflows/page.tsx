'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { WorkflowConfig, WorkflowStage, WorkflowType, ApproverType } from '@/types/core';
import { 
  GitMerge, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowRight,
  User, 
  Shield, 
  Briefcase,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function WorkflowsPage() {
  const [configs, setConfigs] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<WorkflowConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // For Form:
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchConfigs();
    fetchSupportData();
  }, []);

  const fetchConfigs = async () => {
    try {
      const data = await apiFetch('/workflow-configs');
      setConfigs(data);
      if (data.length > 0) setSelectedConfig(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async () => {
    try {
      const [rData, eData] = await Promise.all([
        apiFetch('/access-roles'),
        apiFetch('/employees?lite=true')
      ]);
      setRoles(rData);
      setEmployees(eData);
    } catch (err) {
      console.error(err);
    }
  };

  const addStage = () => {
    if (!selectedConfig) return;
    const newStage: Partial<WorkflowStage> = {
      name: `Stage ${selectedConfig.stages.length + 1}`,
      sequence: selectedConfig.stages.length + 1,
      approver_type: 'SUPERVISOR',
    };
    setSelectedConfig({
      ...selectedConfig,
      stages: [...selectedConfig.stages, newStage as WorkflowStage]
    });
  };

  const removeStage = (idx: number) => {
    if (!selectedConfig) return;
    const newStages = selectedConfig.stages.filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, sequence: i + 1 }));
    setSelectedConfig({ ...selectedConfig, stages: newStages });
  };

  const updateStage = (idx: number, field: keyof WorkflowStage, value: any) => {
    if (!selectedConfig) return;
    const newStages = [...selectedConfig.stages];
    newStages[idx] = { ...newStages[idx], [field]: value };
    setSelectedConfig({ ...selectedConfig, stages: newStages });
  };

  const handleSave = async () => {
    if (!selectedConfig) return;
    setSaving(true);
    try {
      // 1. Update/Create stages. The backend model is set up as config has stages.
      // In a real enterprise app, we'd handle bulk update or individual calls.
      // For now, let's assume we update the stages individually via API.
      
      // First, ensure the config itself is updated (active status)
      await apiFetch(`/workflow-configs/${selectedConfig.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: selectedConfig.is_active })
      });

      // Update/Create each stage
      // Note: This is an abstraction. In production, use a single bulk endpoint.
      for (const stage of selectedConfig.stages) {
        if (stage.id) {
          await apiFetch(`/workflow-stages/${stage.id}`, {
            method: 'PATCH',
            body: JSON.stringify(stage)
          });
        } else {
          await apiFetch('/workflow-stages', {
            method: 'POST',
            body: JSON.stringify({ ...stage, workflow: selectedConfig.id })
          });
        }
      }
      
      toast.success('Workflow updated successfully');
      fetchConfigs();
    } catch (err: any) {
      toast.error(`Failed to save workflow: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Approval Builder</h1>
            <p className="text-muted-foreground mt-1">Design N-level approval routing for company processes.</p>
          </div>
          <button 
            data-testid="save-workflow-btn"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-semibold shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Config Tabs */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-2">Workflows</h2>
            {loading ? (
              <div className="p-4 space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 animate-pulse rounded-xl" />)}
              </div>
            ) : (
              configs.map((config) => (
                <button
                  key={config.id}
                  onClick={() => setSelectedConfig(config)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedConfig?.id === config.id 
                      ? 'glass-card border-primary/50 text-foreground ring-1 ring-primary/20' 
                      : 'hover:bg-white/5 border-transparent text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      selectedConfig?.id === config.id ? 'bg-primary text-white' : 'bg-white/5'
                    }`}>
                      <GitMerge size={16} />
                    </div>
                    <span className="font-semibold">{config.model_type}</span>
                  </div>
                  {selectedConfig?.id === config.id && <ChevronRight size={16} className="text-primary" />}
                </button>
              ))
            )}
          </div>

          {/* Builder Area */}
          <div className="lg:col-span-3 space-y-8">
            {selectedConfig ? (
              <>
                {/* Active Toggle */}
                <div className="glass-card rounded-3xl p-6 border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${selectedConfig.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Workflow Status</h3>
                      <p className="text-sm text-muted-foreground">Toggle to enable or disable this routing logic globaly.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedConfig({...selectedConfig, is_active: !selectedConfig.is_active})}
                    className={`relative w-14 h-8 rounded-full transition-colors ${selectedConfig.is_active ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      animate={{ x: selectedConfig.is_active ? 28 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>

                {/* Stages Timeline */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Briefcase size={20} className="text-primary" />
                    Approval Sequence
                  </h3>

                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {selectedConfig.stages.map((stage, idx) => (
                        <motion.div
                          key={stage.id || `temp-${idx}`}
                          data-testid="stage-row"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="relative flex items-start gap-6 group"
                        >
                          {/* Sequence Indicator */}
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold relative z-10 shadow-lg shadow-primary/20">
                              {stage.sequence}
                            </div>
                            {idx < selectedConfig.stages.length - 1 && (
                              <div className="w-0.5 flex-1 bg-gradient-to-b from-primary to-transparent" />
                            )}
                          </div>

                          {/* Stage Card */}
                          <div className="flex-1 glass-card rounded-3xl p-6 border hover:border-primary/30 transition-all">
                            <div className="flex items-center justify-between mb-4">
                              <input 
                                className="bg-transparent border-none text-xl font-bold outline-none focus:text-primary transition-colors"
                                value={stage.name}
                                placeholder="Stage Name"
                                onChange={(e) => updateStage(idx, 'name', e.target.value)}
                              />
                              <button 
                                onClick={() => removeStage(idx)}
                                className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Approver Entity Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {(['SUPERVISOR', 'ROLE', 'EMPLOYEE'] as ApproverType[]).map(type => (
                                    <button
                                      key={type}
                                      onClick={() => updateStage(idx, 'approver_type', type)}
                                      className={`py-2 text-xs rounded-lg border transition-all ${
                                        stage.approver_type === type 
                                          ? 'bg-primary/10 border-primary text-primary font-bold' 
                                          : 'border-white/5 text-muted-foreground hover:bg-white/5'
                                      }`}
                                    >
                                      {type}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Assignment Target</label>
                                {stage.approver_type === 'SUPERVISOR' ? (
                                  <div className="h-10 w-full rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center px-4 text-sm text-muted-foreground italic">
                                    Uses Employee's Direct Supervisor
                                  </div>
                                ) : stage.approver_type === 'ROLE' ? (
                                  <select 
                                    name={`stages[${idx}].approver_role`}
                                    className="w-full h-10 px-4 rounded-xl glass-card border bg-transparent text-sm"
                                    value={stage.approver_role || ''}
                                    onChange={(e) => updateStage(idx, 'approver_role', e.target.value)}
                                  >
                                    <option value="">Select Role...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                  </select>
                                ) : (
                                  <select 
                                    name={`stages[${idx}].approver_employee`}
                                    className="w-full h-10 px-4 rounded-xl glass-card border bg-transparent text-sm"
                                    value={stage.approver_employee || ''}
                                    onChange={(e) => updateStage(idx, 'approver_employee', e.target.value)}
                                  >
                                    <option value="">Select Employee...</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullname}</option>)}
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Add Stage Trigger */}
                    <button 
                      onClick={addStage}
                      className="ml-5 flex items-center gap-3 px-6 py-4 rounded-2xl border border-dashed border-white/20 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all group"
                    >
                      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <Plus size={18} />
                      </div>
                      <span className="font-semibold">Add Approval Level</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-50">
                <GitMerge size={60} />
                <p>Select a workflow type to begin designing the sequence.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
