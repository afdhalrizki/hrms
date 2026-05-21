import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../utils/style_utils.dart';

class TicketDetailScreen extends StatefulWidget {
  final int ticketId;
  final Map<String, dynamic> userData;

  const TicketDetailScreen({super.key, required this.ticketId, required this.userData});

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _replyController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  Map<String, dynamic>? _ticket;
  List<dynamic> _messages = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    try {
      final res = await _api.getInternalTicketDetail(widget.ticketId);
      setState(() {
        _ticket = res;
        _messages = res['messages'] ?? [];
        _loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      debugPrint("TICKET_DETAIL_ERROR: $e");
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load details: $e')),
        );
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendReply() async {
    final text = _replyController.text.trim();
    if (text.isEmpty) return;

    setState(() => _sending = true);
    try {
      await _api.replyInternalTicket(widget.ticketId, {'message': text});
      _replyController.clear();
      await _fetchDetails();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $e')),
        );
      }
    } finally {
      setState(() => _sending = false);
    }
  }

  Future<void> _resolveTicket() async {
    try {
      await _api.resolveInternalTicket(widget.ticketId);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tiket diselesaikan')),
      );
      _fetchDetails();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memproses tiket: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _ticket?['status'] ?? 'OPEN';
    final isClosed = status == 'RESOLVED' || status == 'CLOSED';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          _ticket?['title'] ?? 'Detail Tiket',
          style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (!isClosed && _ticket != null)
            TextButton.icon(
              onPressed: _resolveTicket,
              icon: const Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 18),
              label: Text('Selesai', style: AppTheme.plusJakartaSans(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 12)),
            )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Colors.blueAccent))
          : Column(
              children: [
                // Ticket Meta Information
                Container(
                  padding: const EdgeInsets.all(16),
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.blueAccent.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _ticket?['category'] ?? 'General',
                              style: AppTheme.plusJakartaSans(color: Colors.blueAccent, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ),
                          Text(
                            status,
                            style: AppTheme.plusJakartaSans(
                              color: isClosed ? Colors.greenAccent : Colors.orangeAccent,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _ticket?['description'] ?? '',
                        style: AppTheme.plusJakartaSans(color: Colors.white70, fontSize: 13, height: 1.4),
                      ),
                    ],
                  ),
                ),

                // Chat Messages List
                Expanded(
                  child: _messages.isEmpty
                      ? Center(child: Text('Belum ada pesan percakapan', style: AppTheme.plusJakartaSans(color: Colors.white30)))
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final msg = _messages[index];
                            final isSelf = msg['sender_email'] == widget.userData['email'];

                            return Align(
                              alignment: isSelf ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isSelf
                                      ? Colors.blueAccent.withOpacity(0.2)
                                      : Colors.white.withOpacity(0.05),
                                  borderRadius: BorderRadius.only(
                                    topLeft: const Radius.circular(16),
                                    topRight: const Radius.circular(16),
                                    bottomLeft: isSelf ? const Radius.circular(16) : Radius.zero,
                                    bottomRight: isSelf ? Radius.zero : const Radius.circular(16),
                                  ),
                                  border: Border.all(
                                    color: isSelf ? Colors.blueAccent.withOpacity(0.3) : Colors.white10,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      msg['sender_name'] ?? 'Staff',
                                      style: AppTheme.plusJakartaSans(
                                        color: isSelf ? Colors.blueAccent : Colors.white54,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      msg['message'] ?? '',
                                      style: AppTheme.plusJakartaSans(color: Colors.white, fontSize: 13, height: 1.3),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),

                // Reply Input Field
                if (!isClosed)
                  SafeArea(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: const BoxDecoration(
                        color: Color(0xFF1E293B),
                        border: Border(top: BorderSide(color: Colors.white10)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _replyController,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                hintText: 'Ketik balasan...',
                                hintStyle: const TextStyle(color: Colors.white30),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                filled: true,
                                fillColor: Colors.white.withOpacity(0.03),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(24),
                                  borderSide: BorderSide.none,
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(24),
                                  borderSide: BorderSide.none,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: _sending ? null : _sendReply,
                            icon: _sending
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Icon(Icons.send, color: Colors.blueAccent),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    color: Colors.green.withOpacity(0.05),
                    child: Center(
                      child: Text(
                        'Tiket ini telah ditandai selesai.',
                        style: AppTheme.plusJakartaSans(color: Colors.greenAccent, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}
