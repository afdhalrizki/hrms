'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Lock,
  Send,
  Eye,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/shared/Skeleton';
import { useSearchParams } from 'next/navigation';

interface TicketMessage {
  id: number;
  sender_name: string;
  sender_email: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  creator_name?: string;
  creator_email?: string;
  assigned_to_name?: string;
  assigned_agent_name?: string;
  created_at: string;
  messages: TicketMessage[];
}

export default function TicketsPage() {
  const t = useTranslations('HelpSupport');
  const tCommon = useTranslations('Common');
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Scope & Lists State
  const [scope, setScope] = useState<'internal' | 'platform'>('internal');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail State
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Message Form State
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Ticket Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('LOW');
  const [submitting, setSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Role Checks
  const isGlobalAdmin = user?.is_global_admin || user?.global_role === 'SUPERADMIN' || user?.global_role === 'SUPPORT_AGENT';
  const isTenantAdmin = user?.is_staff && !isGlobalAdmin;

  // Handle query parameter initialization (e.g. from floating widget click)
  useEffect(() => {
    const qId = searchParams.get('id');
    const qScope = searchParams.get('scope');
    if (qScope === 'platform' && isTenantAdmin) {
      setScope('platform');
    }
    if (qId) {
      const parsed = parseInt(qId, 10);
      if (!isNaN(parsed)) {
        setSelectedTicketId(parsed);
      }
    }
  }, [searchParams, isTenantAdmin]);

  // Fetch Tickets list when scope changes
  useEffect(() => {
    fetchTickets();
  }, [scope]);

  // Fetch Ticket details when selectedTicketId changes
  useEffect(() => {
    if (selectedTicketId !== null) {
      fetchTicketDetail(selectedTicketId);
    } else {
      setTicketDetail(null);
    }
  }, [selectedTicketId]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticketDetail?.messages]);

  const fetchTickets = async () => {
    try {
      setLoadingList(true);
      const endpoint = scope === 'internal' ? '/internal-tickets/' : '/platform-tickets/';
      const res = await apiFetch(endpoint);
      if (Array.isArray(res)) {
        setTickets(res);
      } else if (res && Array.isArray(res.results)) {
        setTickets(res.results);
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil daftar tiket');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchTicketDetail = async (id: number) => {
    try {
      setLoadingDetail(true);
      const endpoint = scope === 'internal' ? `/internal-tickets/${id}/` : `/platform-tickets/${id}/`;
      const res = await apiFetch(endpoint);
      setTicketDetail(res);
      setShowCreateForm(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil rincian tiket');
      setSelectedTicketId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || selectedTicketId === null) return;

    try {
      setSendingReply(true);
      const endpoint = scope === 'internal' 
        ? `/internal-tickets/${selectedTicketId}/messages/` 
        : `/platform-tickets/${selectedTicketId}/messages/`;

      const body: any = { message: replyText };
      if (scope === 'internal' && isTenantAdmin) {
        body.is_internal = isInternalNote;
      }

      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setReplyText('');
      setIsInternalNote(false);
      // Reload ticket detail
      fetchTicketDetail(selectedTicketId);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim pesan');
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolveTicket = async () => {
    if (selectedTicketId === null) return;
    try {
      const endpoint = scope === 'internal'
        ? `/internal-tickets/${selectedTicketId}/resolve/`
        : `/platform-tickets/${selectedTicketId}/resolve/`;

      await apiFetch(endpoint, { method: 'POST' });
      toast.success(t('ticketResolved'));
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses tiket');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !newCategory) {
      toast.error('Semua data wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = scope === 'internal' ? '/internal-tickets/' : '/platform-tickets/';
      const body = {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
      };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      toast.success(t('successCreate'));
      setNewTitle('');
      setNewDesc('');
      setNewCategory('');
      setNewPriority('LOW');
      setShowCreateForm(false);
      
      // Auto-select the newly created ticket
      if (res && res.id) {
        setSelectedTicketId(res.id);
      }
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat tiket');
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ticket.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setSelectedTicketId(null);
            }}
            className="px-6 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} />
            {t('createTicket')}
          </button>
        </div>

        {/* Split Pane Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[650px]">
          {/* Left Column: Tickets List */}
          <div className="lg:col-span-4 flex flex-col glass-card border border-white/10 rounded-3xl overflow-hidden bg-background/30">
            {/* Scope Toggle for Tenant Admin */}
            {isTenantAdmin && (
              <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                <div className="flex rounded-xl bg-white/5 p-1 text-xs font-bold">
                  <button
                    onClick={() => { setScope('internal'); setSelectedTicketId(null); }}
                    className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                      scope === 'internal' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Internal HR
                  </button>
                  <button
                    onClick={() => { setScope('platform'); setSelectedTicketId(null); }}
                    className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                      scope === 'platform' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    SaaS Support
                  </button>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-white/5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Cari tiket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-primary/50 transition-colors text-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-1.5">
                  <Filter size={12} />
                  <span>Status:</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-primary font-bold cursor-pointer"
                >
                  <option value="ALL">Semua</option>
                  <option value="OPEN">Terbuka</option>
                  <option value="IN_PROGRESS">Diproses</option>
                  <option value="RESOLVED">Selesai</option>
                  <option value="CLOSED">Ditutup</option>
                </select>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {loadingList ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-16 space-y-2 text-muted-foreground">
                  <MessageSquare size={24} className="mx-auto opacity-40" />
                  <p className="text-xs">{t('noTickets')}</p>
                </div>
              ) : (
                filteredTickets.map((tItem) => {
                  const isSelected = selectedTicketId === tItem.id;
                  return (
                    <motion.div
                      key={tItem.id}
                      onClick={() => setSelectedTicketId(tItem.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative overflow-hidden",
                        isSelected 
                          ? "bg-primary/10 border-primary/20 text-white" 
                          : "bg-white/[0.01] border-white/5 hover:bg-white/[0.02] text-muted-foreground hover:text-white"
                      )}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <h4 className="text-xs font-bold leading-tight truncate flex-1">{tItem.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase shrink-0 ${getStatusBadgeClass(tItem.status)}`}>
                          {t(`statuses.${tItem.status}`)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] mt-1 text-muted-foreground/80">
                        <div className="flex items-center gap-2">
                          <span>{t(`categories.${tItem.category}`)}</span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityBadgeClass(tItem.priority)}`}>
                            {t(`priorities.${tItem.priority}`)}
                          </span>
                        </div>
                        <span className="opacity-60">{tItem.created_at?.split('T')[0] || tItem.created_on?.split('T')[0]}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat/Create View */}
          <div className="lg:col-span-8 flex flex-col glass-card border border-white/10 rounded-3xl overflow-hidden bg-background/30 relative">
            {showCreateForm ? (
              // Create Ticket Form
              <div className="p-8 h-full flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">Buat Tiket Baru</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scope === 'internal' 
                        ? 'Ajukan keluhan operasional atau administrasi ke tim HR internal.' 
                        : 'Laporkan bug teknis, masalah billing, atau feedback langsung ke developer SaaS.'}
                    </p>
                  </div>

                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">{t('ticketTitle')}</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
                        placeholder="Contoh: Selisih nominal BPJS di payslip Mei"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">{t('category')}</label>
                        <select
                          required
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full px-3 py-3.5 rounded-xl bg-zinc-900 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
                        >
                          <option value="">-- Pilih Kategori --</option>
                          {scope === 'internal' ? (
                            <>
                              <option value="GENERAL">General / Inquiry</option>
                              <option value="PAYROLL">Payroll & Gaji</option>
                              <option value="ATTENDANCE">Kehadiran & Absensi</option>
                              <option value="LEAVE">Cuti & Izin</option>
                              <option value="TECHNICAL">Masalah Teknis Alat</option>
                            </>
                          ) : (
                            <>
                              <option value="OTHER">Bantuan Umum</option>
                              <option value="BILLING">Billing & Subscription</option>
                              <option value="BUG">Sistem Bug / Error</option>
                              <option value="FEATURE_REQUEST">Feature Request</option>
                              <option value="ONBOARDING">Bantuan Onboarding</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">{t('priority')}</label>
                        <select
                          value={newPriority}
                          onChange={(e) => setNewPriority(e.target.value)}
                          className="w-full px-3 py-3.5 rounded-xl bg-zinc-900 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">{t('ticketDesc')}</label>
                      <textarea
                        required
                        rows={6}
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors text-white resize-none"
                        placeholder="Deskripsikan masalah Anda secara lengkap..."
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="flex-1 py-3.5 border border-white/10 hover:bg-white/5 rounded-xl font-bold text-sm text-muted-foreground hover:text-white transition-all cursor-pointer"
                      >
                        {tCommon('cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-3.5 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {submitting ? tCommon('loading') : 'Buat Tiket'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : ticketDetail ? (
              // Chat Interface
              <div className="h-full flex flex-col">
                {/* Chat Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white leading-tight">{ticketDetail.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Oleh: {ticketDetail.creator_name || ticketDetail.creator_email}</span>
                      <span>•</span>
                      <span>Kategori: {t(`categories.${ticketDetail.category}`)}</span>
                    </div>
                  </div>
                  {/* Resolve button (for HR Admins or active staff) */}
                  {(isTenantAdmin || (scope === 'internal' && ticketDetail.creator_email === user?.email)) && 
                    ticketDetail.status !== 'RESOLVED' && ticketDetail.status !== 'CLOSED' && (
                    <button
                      onClick={handleResolveTicket}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      {t('resolve')}
                    </button>
                  )}
                </div>

                {/* Messages Box */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                  {/* Original Description Message */}
                  <div className="flex items-start gap-4">
                    <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">
                      C
                    </div>
                    <div className="flex-1 space-y-1 max-w-[80%]">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-bold text-white">{ticketDetail.creator_name || 'Creator'}</span>
                        <span>{ticketDetail.created_at?.split('T')[0]}</span>
                      </div>
                      <div className="p-4 rounded-3xl bg-white/5 border border-white/5 text-xs text-white/90 leading-relaxed whitespace-pre-wrap">
                        {ticketDetail.description}
                      </div>
                    </div>
                  </div>

                  {/* Thread messages */}
                  {ticketDetail.messages && ticketDetail.messages.map((msg) => {
                    const isSystem = !msg.sender_email;
                    const isSelf = msg.sender_email === user?.email;
                    return (
                      <div 
                        key={msg.id}
                        className={cn(
                          "flex items-start gap-4",
                          isSelf ? "flex-row-reverse" : ""
                        )}
                      >
                        {!isSystem && (
                          <div className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold border",
                            isSelf 
                              ? "bg-accent/20 text-accent border-accent/20"
                              : "bg-white/10 text-muted-foreground border-white/10"
                          )}>
                            {msg.sender_name?.substring(0, 2).toUpperCase() || 'U'}
                          </div>
                        )}
                        
                        <div className={cn(
                          "flex-1 space-y-1 max-w-[85%]",
                          isSelf ? "text-right" : ""
                        )}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-start inline-flex">
                            <span className="font-bold text-white">{msg.sender_name || 'System'}</span>
                            <span>{msg.created_at?.split('T')[0]}</span>
                            {msg.is_internal && (
                              <span className="bg-red-500/10 text-red-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-red-500/20 inline-flex items-center gap-1">
                                <Lock size={8} /> Internal
                              </span>
                            )}
                          </div>
                          
                          <div className={cn(
                            "p-4 rounded-3xl text-xs text-white/90 leading-relaxed text-left whitespace-pre-wrap border",
                            msg.is_internal 
                              ? "bg-red-500/5 border-red-500/10 text-red-200/90"
                              : isSelf 
                                ? "bg-primary/20 border-primary/20" 
                                : "bg-white/5 border-white/5"
                          )}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                {ticketDetail.status !== 'RESOLVED' && ticketDetail.status !== 'CLOSED' ? (
                  <form onSubmit={handleSendReply} className="p-6 border-t border-white/5 bg-white/[0.01] space-y-3">
                    {scope === 'internal' && isTenantAdmin && (
                      <label className="flex items-center gap-2 text-xs text-red-400 font-bold select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded border-white/10 bg-black text-red-500 focus:ring-red-500/50"
                        />
                        <Lock size={12} />
                        {t('internalNote')}
                      </label>
                    )}

                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="Ketik pesan balasan..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 text-white"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyText.trim()}
                        className="px-5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        {sendingReply ? '...' : <Send size={16} />}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-6 border-t border-white/5 bg-white/[0.01] text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span>{t('ticketResolved')}</span>
                  </div>
                )}
              </div>
            ) : (
              // Empty View
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Eye size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Pilih Tiket Bantuan</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Pilih salah satu tiket di sebelah kiri untuk melihat percakapan lengkap atau klik "Buat Tiket Baru" untuk mengajukan aduan baru.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
