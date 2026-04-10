import 'dart:io';
import 'package:flutter/material.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';
import '../widgets/loading_indicator.dart';
import '../models/leave_model.dart';
import 'leave_apply_screen.dart';

class LeaveListScreen extends StatefulWidget {
  const LeaveListScreen({super.key});

  @override
  State<LeaveListScreen> createState() => _LeaveListScreenState();
}

class _LeaveListScreenState extends State<LeaveListScreen> {
  final ApiService _apiService = ApiService();
  List<LeaveRequest> _leaves = [];
  LeaveBalance? _balance;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final leaveData = await _apiService.getLeaveRequests();
      final balanceData = await _apiService.getLeaveBalances();

      if (!mounted) return;
      setState(() {
        _leaves = (leaveData as List).map((l) => LeaveRequest.fromJson(l)).toList();
        print('DEBUG E2E: Fetched leaves: ${_leaves.length}');
        if ((balanceData as List).isNotEmpty) {
          _balance = LeaveBalance.fromJson(balanceData.first);
        }
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
      appBar: AppBar(title: const Text('My Leaves')),
      body: _isLoading
          ? const Center(
              child: AppLoadingIndicator(color: Colors.blue),
            )
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: Column(
                children: [
                  if (_balance != null) _buildBalanceCard(),
                  Expanded(
                    child: _leaves.isEmpty
                        ? Builder(builder: (context) {
                            print('DEBUG E2E: Showing empty state: No leave requests found');
                            return const Center(child: Text('No leave requests found'));
                          })
                        : ListView.builder(
                            itemCount: _leaves.length,
                            itemBuilder: (context, index) {
                              final leave = _leaves[index];
                              return Card(
                                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                child: ListTile(
                                  title: Text('${leave.leaveType} - ${leave.startDate}'),
                                  subtitle: Text(leave.reason),
                                  trailing: Chip(
                                    label: Text(leave.status),
                                    backgroundColor: _getStatusColor(leave.status).withOpacity(0.2),
                                    labelStyle: TextStyle(color: _getStatusColor(leave.status)),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const LeaveApplyScreen()),
          );
          if (result == true) _fetchData();
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildBalanceCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Leave Balance', style: TextStyle(color: Colors.white70)),
          const SizedBox(height: 8),
          Text(
            '${_balance!.remainingDays.toStringAsFixed(1)} Days Left',
            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'Used: ${_balance!.usedDays} / Total: ${_balance!.totalDays}',
            style: const TextStyle(color: Colors.white60),
          ),
        ],
      ),
    );
  }
}
