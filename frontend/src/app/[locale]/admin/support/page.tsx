'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  Filter,
  LifeBuoy,
  UserCheck,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/shared/Skeleton';

interface TicketMessage {
  id: number;
  sender: number;
  sender_name: string;
  message: string;
  created_at: string;
}

interface PlatformTicketDetail {
  id: number;
  tenant_name: string;
  creator_email: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_agent_name?: string;
  created_at: string;
  messages: TicketMessage[];
}

export default function GlobalSupportPage() {
  const t = useTranslations('HelpSupport');
  const tCommon = useTranslations('Common');
  const { user, loading: authLoading } = useAuth();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetail, setTicketDetail] = useState<PlatformTicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isAuthorized = user && (
    user.global_role === 'SUPERADMIN' || 
    user.global_role === 'SUPPORT_AGENT' || 
    (!user.global_role && user.is_global_admin)
  );

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchTickets();
    }
  }, [authLoading, isAuthorized]);

  useEffect(() => {
    if (selectedTicketId !== null) {
      fetchTicketDetail(selectedTicketId);
    } else {
      setTicketDetail(null);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticketDetail?.messages]);

  const fetchTickets = async () => {
    try {
      setLoadingList(true);
      const res = await apiFetch('/platform-tickets/');
      if (Array.isArray(res)) {
        setTickets(res);
      } else if (res && Array.isArray(res.results)) {
        setTickets(res.results);
      } else {
        setTickets([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengambil daftar tiket platform');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchTicketDetail = async (id: number) => {
    try {
      setLoadingDetail(true);
      const res = await apiFetch(`/platform-tickets/${id}/`);
      setTicketDetail(res);
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
      await apiFetch(`/platform-tickets/${selectedTicketId}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText }),
      });
      setReplyText('');
      fetchTicketDetail(selectedTicketId);
      // Refresh list to update updated_at and message count
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim balasan');
    } finally {
      setSendingReply(false);
    }
  };

  const handleAssignToMe = async () => {
    if (selectedTicketId === null) return;
    try {
      await apiFetch(`/platform-tickets/${selectedTicketId}/assign/`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success('Tiket berhasil ditugaskan ke Anda');
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menugaskan tiket');
    }
  };

  const handleResolveTicket = async () => {
    if (selectedTicketId === null) return;
    try {
      await apiFetch(`/platform-tickets/${selectedTicketId}/resolve/`, { method: 'POST' });
      toast.success(t('ticketResolved'));
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses penyelesaian tiket');
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse font-medium">{tCommon('loading')}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <AlertCircle size={48} className="text-red-500" />
          <h2 className="text-2xl font-bold">Akses Ditolak</h2>
          <p className="text-muted-foreground">Hanya administrator global yang diperbolehkan mengakses halaman ini.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ticket.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.creator_email?.toLowerCase().includes(searchQuery.toLowerCase());
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
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <LifeBuoy className="text-primary" size={32} />
            Portal Dukungan SaaS
          </h1>
          <p className="text-muted-foreground">Kelola dan selesaikan tiket aduan teknis dan billing dari pelanggan tenant.</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Tiket Masuk', value: tickets.length, icon: MessageSquare, color: 'text-blue-500' },
            { label: 'Menunggu Penanganan', value: tickets.filter(t => t.status === 'OPEN').length, icon: Clock, color: 'text-orange-500' },
            { label: 'Berhasil Diselesaikan', value: tickets.filter(t => t.status === 'RESOLVED').length, icon: CheckCircle2, color: 'text-emerald-500' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-6 rounded-[2rem] border border-white/5 flex items-center gap-4 bg-background/20">
              <div className={cn("p-4 rounded-2xl bg-white/5", stat.color)}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Split Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[650px]">
          {/* Left Pane: Ticket List */}
          <div className="lg:col-span-4 flex flex-col glass-card border border-white/10 rounded-3xl overflow-hidden bg-background/30">
            <div className="p-4 border-b border-white/5 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Cari tiket/tenant/creator..."
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

            {/* List scroll container */}
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
                  <p className="text-xs">Tidak ada tiket platform ditemukan.</p>
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
                      <div className="flex items-center gap-1.5 text-[9px] text-primary font-bold">
                        <Building2 size={10} />
                        <span>{tItem.tenant_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground/80">
                        <div className="flex items-center gap-2">
                          <span>{t(`categories.${tItem.category}`)}</span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityBadgeClass(tItem.priority)}`}>
                            {t(`priorities.${tItem.priority}`)}
                          </span>
                        </div>
                        <span className="opacity-60">{tItem.created_at?.split('T')[0]}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Thread Detail */}
          <div className="lg:col-span-8 flex flex-col glass-card border border-white/10 rounded-3xl overflow-hidden bg-background/30">
            {loadingDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Memuat detail tiket...</p>
              </div>
            ) : ticketDetail ? (
              <div className="h-full flex flex-col">
                {/* Chat Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white leading-tight">{ticketDetail.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="text-primary font-bold">{ticketDetail.tenant_name}</span>
                      <span>•</span>
                      <span>Oleh: {ticketDetail.creator_email}</span>
                      <span>•</span>
                      <span>Kategori: {t(`categories.${ticketDetail.category}`)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Assign to me option */}
                    {!ticketDetail.assigned_agent_name ? (
                      <button
                        onClick={handleAssignToMe}
                        className="px-3.5 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <UserCheck size={14} />
                        Tangani Tiket
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-muted-foreground font-bold">
                        Ditangani: {ticketDetail.assigned_agent_name}
                      </div>
                    )}

                    {ticketDetail.status !== 'RESOLVED' && ticketDetail.status !== 'CLOSED' && (
                      <button
                        onClick={handleResolveTicket}
                        className="px-3.5 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        {t('resolve')}
                      </button>
                    )}
                  </div>
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
                        <span className="font-bold text-white">{ticketDetail.creator_email}</span>
                        <span>{ticketDetail.created_at?.split('T')[0]}</span>
                      </div>
                      <div className="p-4 rounded-3xl bg-white/5 border border-white/5 text-xs text-white/90 leading-relaxed whitespace-pre-wrap">
                        {ticketDetail.description}
                      </div>
                    </div>
                  </div>

                  {/* Thread messages */}
                  {ticketDetail.messages && ticketDetail.messages.map((msg) => {
                    const isSelf = msg.sender_name === user?.email;
                    return (
                      <div 
                        key={msg.id}
                        className={cn(
                          "flex items-start gap-4",
                          isSelf ? "flex-row-reverse" : ""
                        )}
                      >
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold border",
                          isSelf 
                            ? "bg-accent/20 text-accent border-accent/20"
                            : "bg-white/10 text-muted-foreground border-white/10"
                        )}>
                          {msg.sender_name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        
                        <div className={cn(
                          "flex-1 space-y-1 max-w-[85%]",
                          isSelf ? "text-right" : ""
                        )}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-start inline-flex">
                            <span className="font-bold text-white">{msg.sender_name}</span>
                            <span>{msg.created_at?.split('T')[0]}</span>
                          </div>
                          
                          <div className={cn(
                            "p-4 rounded-3xl text-xs text-white/90 leading-relaxed text-left whitespace-pre-wrap border",
                            isSelf 
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
                  <form onSubmit={handleSendReply} className="p-6 border-t border-white/5 bg-white/[0.01] flex gap-4">
                    <input
                      type="text"
                      placeholder="Ketik balasan Anda..."
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
                  </form>
                ) : (
                  <div className="p-6 border-t border-white/5 bg-white/[0.01] text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <span>{t('ticketResolved')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Eye size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Pilih Tiket Bantuan SaaS</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Pilih salah satu tiket di sebelah kiri untuk melihat pesan aduan teknis dari tenant dan memberikan solusi penanganan.
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
