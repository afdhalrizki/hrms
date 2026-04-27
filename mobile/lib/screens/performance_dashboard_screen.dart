import 'package:flutter/material.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';
import '../widgets/loading_indicator.dart';
import 'self_appraisal_screen.dart';

class PerformanceDashboardScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const PerformanceDashboardScreen({super.key, required this.userData});

  @override
  State<PerformanceDashboardScreen> createState() => _PerformanceDashboardScreenState();
}

class _PerformanceDashboardScreenState extends State<PerformanceDashboardScreen> {
  List<dynamic> _kpiTargets = [];
  List<dynamic> _appraisals = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final api = ApiService();
      final kpis = await api.getKPITargets();
      final appraisals = await api.getAppraisals();
      if (mounted) {
        setState(() {
          _kpiTargets = List<dynamic>.from(kpis);
          _appraisals = List<dynamic>.from(appraisals);
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('PerformanceDashboard Error: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
        }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Performance', style: AppTheme.plusJakartaSans(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: _isLoading 
        ? const Center(child: AppLoadingIndicator())
        : RefreshIndicator(
            onRefresh: _loadData,
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                _buildSectionHeader('Current KPIs'),
                const SizedBox(height: 16),
                if (_kpiTargets.isEmpty)
                  _buildEmptyState('No active KPI targets assigned.')
                else
                  ..._kpiTargets.map((kpi) => _buildKPICard(kpi as Map<String, dynamic>)).toList(),
                const SizedBox(height: 32),
                _buildSectionHeader('Appraisal Periods'),
                const SizedBox(height: 16),
                if (_appraisals.isEmpty)
                  _buildEmptyState('No appraisals records found.')
                else
                  ..._appraisals.map((app) => _buildAppraisalCard(app as Map<String, dynamic>)).toList(),
              ],
            ),
          ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: AppTheme.plusJakartaSans(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
    );
  }

  Widget _buildEmptyState(String message) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Center(child: Text(message, style: const TextStyle(color: Colors.white60))),
    );
  }

  Widget _buildKPICard(Map<String, dynamic> kpi) {
    final actual = double.tryParse(kpi['actual_value'].toString()) ?? 0.0;
    final target = double.tryParse(kpi['target_value'].toString()) ?? 1.0;
    final progress = (actual / target).clamp(0.0, 1.0);
    final percentage = (progress * 100).toStringAsFixed(1);

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
              Text(kpi['kpi_name'] ?? 'Unknown KPI', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              Text('$percentage%', style: const TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.white10,
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.blueAccent),
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 12),
          Text(
            'Target: ${kpi['target_value']} • Actual: ${kpi['actual_value']}',
            style: const TextStyle(color: Colors.white60, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildAppraisalCard(Map<String, dynamic> appraisal) {
    final status = appraisal['status'];
    final statusColor = status == 'COMPLETED' ? Colors.green : (status == 'DRAFT' ? Colors.orange : Colors.blueAccent);

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
              Text(appraisal['period_name'] ?? 'Unknown Period', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('${appraisal['start_date']} to ${appraisal['end_date']}', style: const TextStyle(color: Colors.white60, fontSize: 12)),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 8),
              if (status == 'DRAFT' || status == 'SUBMITTED')
                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => SelfAppraisalScreen(appraisal: appraisal, userData: widget.userData),
                      ),
                    ).then((_) => _loadData());
                  },
                  child: const Text('Review', style: TextStyle(color: Colors.blueAccent)),
                ),
              if (status == 'COMPLETED')
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.picture_as_pdf, size: 18, color: Colors.white60),
                      onPressed: () => _downloadReport(appraisal['id'], 'pdf'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.description, size: 18, color: Colors.blueAccent),
                      onPressed: () => _downloadReport(appraisal['id'], 'docx'),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _downloadReport(int id, String format) async {
    try {
      final endpoint = "/performance/appraisals/$id/download_$format/";
      await ApiService().downloadAppraisalPDF(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Download $format started...')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Download failed: $e')),
        );
      }
    }
  }
}
