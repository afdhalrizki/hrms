'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useRouter } from '@/i18n/routing';
import { 
  HelpCircle, 
  X, 
  Search, 
  BookOpen, 
  Ticket, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Plus,
  ArrowRight,
  Send,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from './Skeleton';

interface Guideline {
  title: string;
  description: string;
  steps: string[];
  tips?: string;
}

interface TicketItem {
  id: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at?: string;
  created_on?: string;
}

export function HelpSupportWidget() {
  const t = useTranslations('HelpSupport');
  const tCommon = useTranslations('Common');
  const { user } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'guides' | 'tickets'>('guides');
  
  // Guidelines State
  const [guides, setGuides] = useState<Guideline[]>([]);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);

  // Tickets State
  const [ticketScope, setTicketScope] = useState<'internal' | 'platform'>('internal');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('LOW');
  const [submitting, setSubmitting] = useState(false);

  // Determine user identity
  const isGlobalAdmin = user?.is_global_admin || user?.global_role === 'SUPERADMIN' || user?.global_role === 'SUPPORT_AGENT';
  const isTenantAdmin = user?.is_staff && !isGlobalAdmin;

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'guides') {
        fetchGuidelines();
      } else {
        fetchTickets();
      }
    }
  }, [isOpen, activeTab, ticketScope]);

  const fetchGuidelines = async () => {
    try {
      setGuidesLoading(true);
      const res = await apiFetch('/help/guidelines/?platform=web');
      if (res && res.guidelines) {
        setGuides(res.guidelines);
      }
    } catch (err: any) {
      console.error('Failed to load guidelines', err);
    } finally {
      setGuidesLoading(false);
    }
  };

  const fetchTickets = async () => {
    if (isGlobalAdmin) return; // Global admin views through main dashboard
    try {
      setTicketsLoading(true);
      const endpoint = ticketScope === 'internal' ? '/internal-tickets/' : '/platform-tickets/';
      const res = await apiFetch(endpoint);
      if (Array.isArray(res)) {
        setTickets(res);
      } else if (res && Array.isArray(res.results)) {
        setTickets(res.results);
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.error('Failed to load tickets', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !newCategory) {
      toast.error('Semua field wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = ticketScope === 'internal' ? '/internal-tickets/' : '/platform-tickets/';
      const body = {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
      };

      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      toast.success(t('successCreate'));
      setNewTitle('');
      setNewDesc('');
      setNewCategory('');
      setNewPriority('LOW');
      setIsCreatingTicket(false);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat tiket');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGuides = guides.filter(guide => 
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-green-500/10 text-green-500 border border-green-500/20';
      case 'IN_PROGRESS':
        return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
      default:
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.08, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-gradient-to-tr from-primary to-violet-600 text-white flex items-center justify-center shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all border border-white/20 cursor-pointer"
        aria-label="Help and Support"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div
              key="help"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <HelpCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Slide-out Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="absolute bottom-20 right-0 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-8rem)] rounded-[32px] glass-card border border-white/10 bg-background/90 backdrop-blur-[20px] shadow-2xl flex flex-col overflow-hidden text-foreground"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
              <h2 className="text-xl font-black tracking-tight">{t('title')}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t('subtitle')}</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/5 px-6 gap-6 text-sm">
              <button
                onClick={() => { setActiveTab('guides'); setIsCreatingTicket(false); }}
                className={`py-3 flex items-center gap-2 border-b-2 font-bold transition-all relative ${
                  activeTab === 'guides' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <BookOpen size={16} />
                {t('guidelinesTab')}
              </button>
              
              {!isGlobalAdmin && (
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`py-3 flex items-center gap-2 border-b-2 font-bold transition-all relative ${
                    activeTab === 'tickets' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  <Ticket size={16} />
                  {t('ticketsTab')}
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              {activeTab === 'guides' ? (
                // GUIDELINES TAB
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
                    <input
                      type="text"
                      placeholder={t('searchGuides')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {guidesLoading ? (
                    <div className="space-y-3 pt-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : filteredGuides.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">{t('noGuides')}</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredGuides.map((guide, idx) => {
                        const isExpanded = expandedGuide === idx;
                        return (
                          <div 
                            key={idx}
                            className="rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedGuide(isExpanded ? null : idx)}
                              className="w-full px-5 py-4 flex items-start justify-between text-left gap-4"
                            >
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white leading-tight">{guide.title}</h4>
                                <p className="text-xs text-muted-foreground leading-normal">{guide.description}</p>
                              </div>
                              <div className="text-muted-foreground/60 pt-0.5">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </button>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden bg-white/[0.02] border-t border-white/5"
                                >
                                  <div className="p-5 space-y-4 text-xs">
                                    <ol className="space-y-2 list-decimal list-inside text-muted-foreground leading-relaxed">
                                      {guide.steps.map((step, sIdx) => (
                                        <li key={sIdx} className="pl-1">
                                          <span className="text-white/80">{step}</span>
                                        </li>
                                      ))}
                                    </ol>
                                    {guide.tips && (
                                      <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-start gap-2.5">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        <p className="leading-normal">{guide.tips}</p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // TICKETS TAB
                <div className="h-full flex flex-col">
                  {isCreatingTicket ? (
                    // Create Ticket Form
                    <form onSubmit={handleCreateTicket} className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                          {t('createTicket')}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsCreatingTicket(false)}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          {t('ticketList')}
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">{t('ticketTitle')}</label>
                        <input
                          type="text"
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-muted-foreground">{t('category')}</label>
                          <select
                            required
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-zinc-900 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                          >
                            <option value="">-- Pilih --</option>
                            {ticketScope === 'internal' ? (
                              <>
                                <option value="GENERAL">General</option>
                                <option value="PAYROLL">Payroll</option>
                                <option value="ATTENDANCE">Attendance</option>
                                <option value="LEAVE">Leaves</option>
                                <option value="TECHNICAL">Technical</option>
                              </>
                            ) : (
                              <>
                                <option value="OTHER">Other Technical</option>
                                <option value="BILLING">Billing & Plans</option>
                                <option value="BUG">System Bug / Error</option>
                                <option value="FEATURE_REQUEST">Feature Request</option>
                                <option value="ONBOARDING">Onboarding</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-muted-foreground">{t('priority')}</label>
                          <select
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-zinc-900 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">{t('ticketDesc')}</label>
                        <textarea
                          required
                          rows={4}
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3.5 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? tCommon('loading') : tCommon('submit')}
                        <Send size={14} />
                      </button>
                    </form>
                  ) : (
                    // Ticket List
                    <div className="space-y-4">
                      {/* Ticket Scope Selector (for Tenant Admin) */}
                      {isTenantAdmin && (
                        <div className="flex rounded-xl bg-white/5 p-1 text-xs font-bold">
                          <button
                            onClick={() => setTicketScope('internal')}
                            className={`flex-1 py-2 rounded-lg text-center transition-all ${
                              ticketScope === 'internal' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Internal HR
                          </button>
                          <button
                            onClick={() => setTicketScope('platform')}
                            className={`flex-1 py-2 rounded-lg text-center transition-all ${
                              ticketScope === 'platform' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            SaaS Support
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                          {ticketScope === 'internal' ? t('internalTicket') : t('platformTicket')}
                        </h3>
                        <button
                          onClick={() => setIsCreatingTicket(true)}
                          className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Plus size={12} />
                          {t('createTicket')}
                        </button>
                      </div>

                      {ticketsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                        </div>
                      ) : tickets.length === 0 ? (
                        <div className="text-center py-12 space-y-2">
                          <p className="text-sm text-muted-foreground">{t('noTickets')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tickets.map((tItem) => (
                            <div
                              key={tItem.id}
                              onClick={() => {
                                setIsOpen(false);
                                router.push(`/tickets?id=${tItem.id}&scope=${ticketScope}`);
                              }}
                              className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all flex items-center justify-between gap-4"
                            >
                              <div className="space-y-1 min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">{tItem.title}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span>{t(`categories.${tItem.category}`)}</span>
                                  <span>•</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityBadgeClass(tItem.priority)}`}>
                                    {t(`priorities.${tItem.priority}`)}
                                  </span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${getStatusBadgeClass(tItem.status)}`}>
                                {t(`statuses.${tItem.status}`)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setIsOpen(false);
                          router.push('/tickets');
                        }}
                        className="w-full py-3 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-muted-foreground hover:text-white transition-all flex items-center justify-center gap-1.5"
                      >
                        Lihat Semua Tiket di Dashboard
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
