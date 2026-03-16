import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../api/api_service.dart';

class PayslipScreen extends StatelessWidget {
  const PayslipScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.chevron_left, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Payslip History',
          style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildMonthSelector(),
            const SizedBox(height: 24),
            _buildSummaryCard(),
            const SizedBox(height: 32),
            _buildSectionHeader("Earnings"),
            _buildComponentItem("Basic Salary", "Rp 7.500.000"),
            _buildComponentItem("Transport Allowance", "Rp 1.200.000"),
            _buildComponentItem("Meal Allowance", "Rp 800.000"),
            const SizedBox(height: 24),
            _buildSectionHeader("Deductions"),
            _buildComponentItem("BPJS Kesehatan", "-Rp 150.000", isNegative: true),
            _buildComponentItem("BPJS Ketenagakerjaan", "-Rp 200.000", isNegative: true),
            _buildComponentItem("Income Tax (PPh 21)", "-Rp 350.000", isNegative: true),
            const SizedBox(height: 48),
            _buildDownloadButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(Icons.calendar_today, size: 20, color: Colors.blueAccent),
          Text(
            'February 2026',
            style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600),
          ),
          const Icon(Icons.expand_more, size: 20, color: Colors.white38),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
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
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white38,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Rp 8.800.000',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Paid on 25 Feb 2026',
            style: TextStyle(color: Color(0xFF10B981), fontSize: 13, fontWeight: FontWeight.w600),
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
        style: GoogleFonts.plusJakartaSans(
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
            style: GoogleFonts.firaCode(
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
        try {
          // Assuming ID 1 for demonstration purposes. In a real app, this comes from the route arguments.
          await ApiService().downloadPdf('/payslips/1/download_pdf/', 'Payslip_Mar_2026.pdf');
        } catch (e) {
          debugPrint('Download error: $e');
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
