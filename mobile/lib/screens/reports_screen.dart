import 'package:flutter/material.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';
import '../widgets/loading_indicator.dart';

class ReportsScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const ReportsScreen({super.key, required this.userData});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          "Reporting Center",
          style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: _isLoading 
        ? const Center(child: AppLoadingIndicator(color: Colors.blueAccent))
        : SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 32),
                _buildReportCard(
                  title: "Attendance Report",
                  subtitle: "Download monthly attendance recap and logs.",
                  icon: Icons.calendar_today,
                  color: const Color(0xFF3B82F6),
                  onDownload: () => _handleDownload('attendance', 'Attendance_Recap.xlsx'),
                  qaKey: 'qa_export_attendance',
                ),
                const SizedBox(height: 16),
                _buildReportCard(
                  title: "Payroll Recap",
                  subtitle: "Summary of salaries and deductions for the period.",
                  icon: Icons.receipt_long,
                  color: const Color(0xFF10B981),
                  onDownload: () => _handleDownload('payroll', 'Payroll_Recap.xlsx'),
                  qaKey: 'qa_export_payroll',
                ),
                const SizedBox(height: 16),
                _buildReportCard(
                  title: "Reimbursements",
                  subtitle: "Detailed list of all expense claims and status.",
                  icon: Icons.payments,
                  color: const Color(0xFFF59E0B),
                  onDownload: () => _handleDownload('reimbursement', 'Reimbursement_Recap.xlsx'),
                  qaKey: 'qa_export_reimbursement',
                ),
                const SizedBox(height: 16),
                _buildReportCard(
                  title: "Performance Analysis",
                  subtitle: "Company-wide KPI attainment and appraisal summary.",
                  icon: Icons.trending_up,
                  color: const Color(0xFF8B5CF6),
                  onDownload: () => _handleDownload('performance', 'Performance_Recap.xlsx'),
                  qaKey: 'qa_export_performance',
                ),
              ],
            ),
          ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Business Insights",
          style: AppTheme.plusJakartaSans(
            color: Colors.white60,
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          "Export your data anytime, anywhere.",
          style: AppTheme.plusJakartaSans(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildReportCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onDownload,
    String? qaKey,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTheme.plusJakartaSans(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(color: Colors.white38, fontSize: 13),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: onDownload,
                      key: qaKey != null ? Key(qaKey) : null,
                      icon: const Icon(Icons.download, size: 16),
                      label: const Text("XLSX Recap"),
                      style: TextButton.styleFrom(
                        foregroundColor: color,
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleDownload(String type, String filename) async {
    setState(() => _isLoading = true);
    try {
      String endpoint = "";
      switch (type) {
        case 'attendance': endpoint = "/attendance/export_xlsx/"; break;
        case 'payroll': endpoint = "/payslips/export_recap_xlsx/"; break;
        case 'reimbursement': endpoint = "/reimbursements/export_xlsx/"; break;
        case 'performance': endpoint = "/appraisals/export_xlsx/"; break;
      }

      await ApiService().downloadFile(endpoint);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Download started: $filename"),
            backgroundColor: Colors.blueAccent,
          ),
        );
      }
    } catch (e) {
      debugPrint("DEBUG E2E: DOWNLOAD FAILED for $type: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Failed to download: $e"), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
