import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../utils/style_utils.dart';
import 'ticket_detail_screen.dart';

class HelpSupportScreen extends StatefulWidget {
  final Map<String, dynamic> userData;

  const HelpSupportScreen({super.key, required this.userData});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _api = ApiService();

  // Guidelines state
  List<dynamic> _allGuidelines = [];
  List<dynamic> _filteredGuidelines = [];
  bool _loadingGuidelines = true;
  String _guideQuery = '';

  // Tickets state
  List<dynamic> _tickets = [];
  bool _loadingTickets = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchGuidelines();
    _fetchTickets();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchGuidelines() async {
    try {
      final res = await _api.getHelpGuidelines();
      setState(() {
        _allGuidelines = res;
        _filteredGuidelines = res;
        _loadingGuidelines = false;
      });
    } catch (e) {
      setState(() => _loadingGuidelines = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load guidelines: $e')),
        );
      }
    }
  }

  Future<void> _fetchTickets() async {
    try {
      final res = await _api.getInternalTickets();
      setState(() {
        _tickets = res;
        _loadingTickets = false;
      });
    } catch (e) {
      setState(() => _loadingTickets = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load tickets: $e')),
        );
      }
    }
  }

  void _filterGuidelines(String query) {
    setState(() {
      _guideQuery = query;
      if (query.isEmpty) {
        _filteredGuidelines = _allGuidelines;
      } else {
        _filteredGuidelines = _allGuidelines.where((item) {
          final title = (item['title'] ?? '').toString().toLowerCase();
          final desc = (item['description'] ?? '').toString().toLowerCase();
          return title.contains(query.toLowerCase()) || desc.contains(query.toLowerCase());
        }).toList();
      }
    });
  }

  void _showGuidelineDialog(Map<String, dynamic> guide) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text(
          guide['title'] ?? '',
          style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blueAccent.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  guide['category'] ?? 'General',
                  style: AppTheme.plusJakartaSans(color: Colors.blueAccent, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                guide['description'] ?? '',
                style: AppTheme.plusJakartaSans(color: Colors.white70, fontSize: 14, height: 1.5),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close', style: AppTheme.plusJakartaSans(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showCreateTicketSheet() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String category = 'GENERAL';
    String priority = 'LOW';
    bool submitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 48,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Buat Tiket Bantuan',
                  style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ajukan pertanyaan atau keluhan operasional kepada tim HR perusahaan.',
                  style: AppTheme.plusJakartaSans(color: Colors.white54, fontSize: 12),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: titleController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Subjek / Judul Tiket',
                    labelStyle: const TextStyle(color: Colors.white54),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.03),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Colors.white10)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Colors.blueAccent)),
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: category,
                  dropdownColor: const Color(0xFF1E293B),
                  style: AppTheme.plusJakartaSans(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Kategori',
                    labelStyle: const TextStyle(color: Colors.white54),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.03),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'GENERAL', child: Text('Umum / Lainnya')),
                    DropdownMenuItem(value: 'PAYROLL', child: Text('Payroll & Gaji')),
                    DropdownMenuItem(value: 'ATTENDANCE', child: Text('Kehadiran & Absensi')),
                    DropdownMenuItem(value: 'LEAVE', child: Text('Cuti & Izin')),
                    DropdownMenuItem(value: 'TECHNICAL', child: Text('Masalah Teknis')),
                  ],
                  onChanged: (val) => setSheetState(() => category = val!),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: priority,
                  dropdownColor: const Color(0xFF1E293B),
                  style: AppTheme.plusJakartaSans(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Prioritas',
                    labelStyle: const TextStyle(color: Colors.white54),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.03),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'LOW', child: Text('Rendah (Low)')),
                    DropdownMenuItem(value: 'MEDIUM', child: Text('Sedang (Medium)')),
                    DropdownMenuItem(value: 'HIGH', child: Text('Tinggi (High)')),
                    DropdownMenuItem(value: 'URGENT', child: Text('Mendesak (Urgent)')),
                  ],
                  onChanged: (val) => setSheetState(() => priority = val!),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: descController,
                  maxLines: 4,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Deskripsi Detail Masalah',
                    labelStyle: const TextStyle(color: Colors.white54),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.03),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Colors.blueAccent)),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: submitting
                        ? null
                        : () async {
                            final title = titleController.text.trim();
                            final desc = descController.text.trim();
                            if (title.isEmpty || desc.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Semua field wajib diisi')),
                              );
                              return;
                            }

                            setSheetState(() => submitting = true);
                            try {
                              await _api.createInternalTicket({
                                'title': title,
                                'description': desc,
                                'category': category,
                                'priority': priority,
                              });
                              if (mounted) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Tiket berhasil dibuat')),
                                );
                                _fetchTickets();
                              }
                            } catch (e) {
                              setSheetState(() => submitting = false);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Gagal membuat tiket: $e')),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blueAccent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: submitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : Text('Kirim Tiket', style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return Colors.green;
      case 'IN_PROGRESS':
        return Colors.orange;
      default:
        return Colors.purpleAccent;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Bantuan & Tiket',
          style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.blueAccent,
          labelColor: Colors.blueAccent,
          unselectedLabelColor: Colors.white54,
          labelStyle: AppTheme.plusJakartaSans(fontWeight: FontWeight.bold),
          tabs: const [
            Tab(text: 'Panduan'),
            Tab(text: 'Tiket Saya'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateTicketSheet,
        backgroundColor: Colors.blueAccent,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Guidelines
          _loadingGuidelines
              ? const Center(child: CircularProgressIndicator(color: Colors.blueAccent))
              : Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      TextField(
                        onChanged: _filterGuidelines,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'Cari panduan...',
                          hintStyle: const TextStyle(color: Colors.white30),
                          prefixIcon: const Icon(Icons.search, color: Colors.white30),
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.03),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: _filteredGuidelines.isEmpty
                            ? Center(
                                child: Text('Tidak ada panduan ditemukan', style: AppTheme.plusJakartaSans(color: Colors.white38)),
                              )
                            : ListView.builder(
                                itemCount: _filteredGuidelines.length,
                                itemBuilder: (context, index) {
                                  final guide = _filteredGuidelines[index];
                                  return Card(
                                    color: const Color(0xFF1E293B),
                                    margin: const EdgeInsets.only(bottom: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    child: ListTile(
                                      title: Text(
                                        guide['title'] ?? '',
                                        style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      subtitle: Text(
                                        guide['description'] ?? '',
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTheme.plusJakartaSans(color: Colors.white54, fontSize: 12),
                                      ),
                                      trailing: const Icon(Icons.chevron_right, color: Colors.white24),
                                      onTap: () => _showGuidelineDialog(guide),
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),

          // Tab 2: Tickets
          _loadingTickets
              ? const Center(child: CircularProgressIndicator(color: Colors.blueAccent))
              : _tickets.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.message_outlined, size: 48, color: Colors.white.withOpacity(0.2)),
                          const SizedBox(height: 16),
                          Text('Belum ada tiket bantuan', style: AppTheme.plusJakartaSans(color: Colors.white38)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _tickets.length,
                      itemBuilder: (context, index) {
                        final ticket = _tickets[index];
                        final status = ticket['status'] ?? 'OPEN';
                        return Card(
                          color: const Color(0xFF1E293B),
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: ListTile(
                            title: Text(
                              ticket['title'] ?? '',
                              style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            subtitle: Text(
                              'Kategori: ${ticket['category']} • Prioritas: ${ticket['priority']}',
                              style: AppTheme.plusJakartaSans(color: Colors.white54, fontSize: 12),
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: _getStatusColor(status).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: _getStatusColor(status).withOpacity(0.3)),
                              ),
                              child: Text(
                                status,
                                style: AppTheme.plusJakartaSans(color: _getStatusColor(status), fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => TicketDetailScreen(ticketId: ticket['id'], userData: widget.userData),
                                ),
                              );
                              _fetchTickets();
                            },
                          ),
                        );
                      },
                    ),
        ],
      ),
    );
  }
}
