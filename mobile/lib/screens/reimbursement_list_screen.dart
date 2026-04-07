import 'dart:io';
import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../widgets/loading_indicator.dart';
import '../models/reimbursement_model.dart';
import 'reimbursement_apply_screen.dart';

class ReimbursementListScreen extends StatefulWidget {
  const ReimbursementListScreen({super.key});

  @override
  State<ReimbursementListScreen> createState() => _ReimbursementListScreenState();
}

class _ReimbursementListScreenState extends State<ReimbursementListScreen> {
  final ApiService _apiService = ApiService();
  List<Reimbursement> _claims = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchClaims();
  }

  Future<void> _fetchClaims() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final data = await _apiService.getReimbursements();
      if (!mounted) return;
      setState(() {
        _claims = (data as List).map((r) => Reimbursement.fromJson(r)).toList();
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
        setState(() => _isLoading = false);
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'APPROVED': return Colors.green;
      case 'REJECTED': return Colors.red;
      default: return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Reimbursements')),
      body: _isLoading
          ? const Center(
              child: AppLoadingIndicator(color: Colors.blue),
            )
          : RefreshIndicator(
              onRefresh: _fetchClaims,
              child: _claims.isEmpty
                  ? const Center(child: Text('No claims found'))
                  : ListView.builder(
                      itemCount: _claims.length,
                      itemBuilder: (context, index) {
                        final claim = _claims[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: ListTile(
                            title: Text('${claim.categoryName} - IDR ${claim.amount}'),
                            subtitle: Text('${claim.date}\n${claim.description}'),
                            trailing: Chip(
                              label: Text(claim.status),
                              backgroundColor: _getStatusColor(claim.status).withOpacity(0.2),
                              labelStyle: TextStyle(color: _getStatusColor(claim.status)),
                            ),
                            isThreeLine: true,
                          ),
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const ReimbursementApplyScreen()),
          );
          if (result == true) _fetchClaims();
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
