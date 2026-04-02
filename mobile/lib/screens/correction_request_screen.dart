import 'package:flutter/material.dart';
import 'package:mobile/utils/style_utils.dart';
import 'package:intl/intl.dart';
import '../api/api_service.dart';

class CorrectionRequestScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const CorrectionRequestScreen({super.key, required this.userData});

  @override
  State<CorrectionRequestScreen> createState() => _CorrectionRequestScreenState();
}

class _CorrectionRequestScreenState extends State<CorrectionRequestScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _attendanceHistory = [];
  List<dynamic> _correctionRequests = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final api = ApiService();
      final history = await api.getAttendanceRecords();
      final requests = await api.getCorrectionRequests();
      setState(() {
        _attendanceHistory = history;
        _correctionRequests = requests;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Attendance Correction', style: AppTheme.plusJakartaSans(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.blueAccent,
          tabs: const [
            Tab(text: 'History'),
            Tab(text: 'Requests'),
          ],
        ),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : TabBarView(
            controller: _tabController,
            children: [
              _buildHistoryTab(),
              _buildRequestsTab(),
            ],
          ),
    );
  }

  Widget _buildHistoryTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: _attendanceHistory.length,
      itemBuilder: (context, index) {
        final record = _attendanceHistory[index];
        final bool isMissingOut = record['check_out'] == null;
        
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white10),
          ),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    record['date'],
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _buildTimeBadge('In: ${record['check_in'] ?? '--:--'}', Colors.green),
                      const SizedBox(width: 8),
                      _buildTimeBadge('Out: ${record['check_out'] ?? '--:--'}', isMissingOut ? Colors.orange : Colors.blue),
                    ],
                  ),
                ],
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.edit_calendar, color: Colors.blueAccent),
                onPressed: () => _showCorrectionForm(record),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRequestsTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: _correctionRequests.length,
      itemBuilder: (context, index) {
        final req = _correctionRequests[index];
        final statusColor = req['status'] == 'APPROVED' ? Colors.green : (req['status'] == 'REJECTED' ? Colors.red : Colors.orange);

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(req['attendance_date'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  _buildStatusBadge(req['status'], statusColor),
                ],
              ),
              const SizedBox(height: 12),
              Text('Requested: ${req['requested_check_in'] ?? '--'} to ${req['requested_check_out'] ?? '--'}', 
                style: const TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 4),
              Text('Reason: ${req['reason']}', style: const TextStyle(color: Colors.white54, fontSize: 13, fontStyle: FontStyle.italic)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTimeBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildStatusBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  void _showCorrectionForm(Map<String, dynamic> record) {
    final reasonController = TextEditingController();
    TimeOfDay? requestedIn = record['check_in'] != null ? TimeOfDay.fromDateTime(DateTime.parse('2026-01-01 ${record['check_in']}')) : const TimeOfDay(hour: 8, minute: 0);
    TimeOfDay? requestedOut = record['check_out'] != null ? TimeOfDay.fromDateTime(DateTime.parse('2026-01-01 ${record['check_out']}')) : const TimeOfDay(hour: 17, minute: 0);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Request Correction', style: AppTheme.plusJakartaSans(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('For date: ${record['date']}', style: const TextStyle(color: Colors.white60)),
              const SizedBox(height: 24),
              
              Row(
                children: [
                  Expanded(
                    child: _buildTimePicker(
                      'Requested In', 
                      requestedIn!, 
                      (val) => setModalState(() => requestedIn = val)
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTimePicker(
                      'Requested Out', 
                      requestedOut!, 
                      (val) => setModalState(() => requestedOut = val)
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 24),
              TextField(
                controller: reasonController,
                maxLines: 3,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Reason',
                  labelStyle: const TextStyle(color: Colors.white60),
                  filled: true,
                  fillColor: Colors.white.withOpacity(0.05),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () async {
                  final api = ApiService();
                  await api.submitCorrectionRequest({
                    'attendance': record['id'],
                    'requested_check_in': '${requestedIn!.hour.toString().padLeft(2, '0')}:${requestedIn!.minute.toString().padLeft(2, '0')}:00',
                    'requested_check_out': '${requestedOut!.hour.toString().padLeft(2, '0')}:${requestedOut!.minute.toString().padLeft(2, '0')}:00',
                    'reason': reasonController.text,
                  });
                  if (mounted) {
                    Navigator.pop(context);
                    _loadData();
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Correction request submitted!')));
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blueAccent,
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Submit Request', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimePicker(String label, TimeOfDay time, Function(TimeOfDay) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 12)),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            final picked = await showTimePicker(context: context, initialTime: time);
            if (picked != null) onChanged(picked);
          },
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(time.format(context), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }
}
