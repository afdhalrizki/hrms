import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';

class PayslipScreen extends StatefulWidget {
  const PayslipScreen({super.key});

  @override
  State<PayslipScreen> createState() => _PayslipScreenState();
}

class _PayslipScreenState extends State<PayslipScreen> {
  List<dynamic> _payslips = [];
  dynamic _selectedPayslip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPayslips();
  }

  Future<void> _fetchPayslips() async {
    try {
      final api = ApiService();
      final data = await api.getPayslips();
      setState(() {
        _payslips = data;
        if (_payslips.isNotEmpty) {
          _selectedPayslip = _payslips.first;
        }
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${AppLocalizations.of(context)!.error}: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(child: CircularProgressIndicator(color: Colors.blueAccent)),
      );
    }

    if (_payslips.isEmpty) {
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
            AppLocalizations.of(context)!.payslip,
            style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        body: const Center(child: Text("No payslips found", style: TextStyle(color: Colors.white38))),
      );
    }

    final netSalary = double.tryParse(_selectedPayslip?['net_pay']?.toString() ?? '0') ?? 0;
    final paidAt = _selectedPayslip?['payment_date'] != null 
        ? DateFormat('d MMM yyyy').format(DateTime.parse(_selectedPayslip['payment_date']))
        : 'Pending';

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
          AppLocalizations.of(context)!.payslip,
          style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchPayslips,
        color: Colors.blueAccent,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildMonthSelector(),
              const SizedBox(height: 24),
              _buildSummaryCard(netSalary, paidAt),
              const SizedBox(height: 32),
              _buildSectionHeader("Earnings"),
              _buildComponentItem("Basic Salary", "Rp ${NumberFormat('#,###').format(_selectedPayslip?['basic_salary'] ?? 0)}"),
              if (_selectedPayslip?['allowances'] != null)
                ...(_selectedPayslip!['allowances'] as List).map((a) => _buildComponentItem(a['name'], "Rp ${NumberFormat('#,###').format(a['amount'])}")),
              const SizedBox(height: 24),
              _buildSectionHeader("Deductions"),
               if (_selectedPayslip?['deductions'] != null)
                ...(_selectedPayslip!['deductions'] as List).map((d) => _buildComponentItem(d['name'], "-Rp ${NumberFormat('#,###').format(d['amount'])}", isNegative: true)),
              const SizedBox(height: 48),
              _buildDownloadButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMonthSelector() {
    return InkWell(
      onTap: () {
        // Show modal bottom sheet for selection if multiple payslips
        if (_payslips.length > 1) {
          _showPayslipPicker();
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Icon(Icons.calendar_today, size: 20, color: Colors.blueAccent),
            Text(
              _selectedPayslip?['period_name'] ?? 'Select Period',
              style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600),
            ),
            const Icon(Icons.expand_more, size: 20, color: Colors.white38),
          ],
        ),
      ),
    );
  }

  void _showPayslipPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => ListView.builder(
        padding: const EdgeInsets.all(24),
        itemCount: _payslips.length,
        itemBuilder: (context, index) {
          final payslip = _payslips[index];
          return ListTile(
            title: Text(payslip['period_name'], style: const TextStyle(color: Colors.white)),
            onTap: () {
              setState(() => _selectedPayslip = payslip);
              Navigator.pop(context);
            },
          );
        },
      ),
    );
  }

  Widget _buildSummaryCard(double netSalary, String paidAt) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        children: [
          Text(
            'NET SALARY',
            style: AppTheme.plusJakartaSans(
              color: Colors.white38,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            "Rp ${NumberFormat('#,###').format(netSalary)}",
            style: AppTheme.plusJakartaSans(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Paid on $paidAt',
            style: const TextStyle(color: Color(0xFF10B981), fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title.toUpperCase(),
        style: AppTheme.plusJakartaSans(
          color: Colors.white38,
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  Widget _buildComponentItem(String label, String amount, {bool isNegative = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 15)),
          Text(
            amount,
            style: AppTheme.firaCode(
              color: isNegative ? const Color(0xFFEF4444) : Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDownloadButton() {
    return ElevatedButton.icon(
      onPressed: () async {
        if (_selectedPayslip == null) return;
        try {
          await ApiService().downloadPdf(
            "/payslips/${_selectedPayslip['id']}/download_pdf/", 
            'Payslip_${_selectedPayslip['period_name']}.pdf'
          );
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Payslip download started...')),
            );
          }
        } catch (e) {
          debugPrint('Download error: $e');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Failed to download: $e')),
            );
          }
        }
      },
      icon: Icon(Icons.download, size: 20),
      label: const Text('Download PDF'),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.blueAccent,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
    );
  }
}
