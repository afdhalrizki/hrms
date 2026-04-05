import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api/api_service.dart';

class LeaveApplyScreen extends StatefulWidget {
  const LeaveApplyScreen({super.key});

  @override
  State<LeaveApplyScreen> createState() => _LeaveApplyScreenState();
}

class _LeaveApplyScreenState extends State<LeaveApplyScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  String _leaveType = 'CUTI';
  final TextEditingController _reasonController = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _endDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate.isBefore(_startDate)) _endDate = _startDate;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isSubmitting = true);
    try {
      final data = {
        'start_date': DateFormat('yyyy-MM-dd').format(_startDate),
        'end_date': DateFormat('yyyy-MM-dd').format(_endDate),
        'leave_type': _leaveType,
        'reason': _reasonController.text,
      };
      
      await _apiService.applyLeave(data);
      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave request submitted successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Leave Request')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              DropdownButtonFormField<String>(
                value: _leaveType,
                decoration: const InputDecoration(labelText: 'Leave Type'),
                items: const [
                  DropdownMenuItem(value: 'CUTI', child: Text('Cuti (Annual)')),
                  DropdownMenuItem(value: 'IZIN', child: Text('Izin (Permission)')),
                  DropdownMenuItem(value: 'SAKIT', child: Text('Sakit (Sick)')),
                ],
                onChanged: (val) => setState(() => _leaveType = val!),
              ),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Start Date'),
                subtitle: Text(DateFormat('yyyy-MM-dd').format(_startDate)),
                trailing: const Icon(Icons.calendar_today),
                onTap: () => _selectDate(context, true),
              ),
              ListTile(
                title: const Text('End Date'),
                subtitle: Text(DateFormat('yyyy-MM-dd').format(_endDate)),
                trailing: const Icon(Icons.calendar_today),
                onTap: () => _selectDate(context, false),
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const Key('qa_leave_reason'),
                controller: _reasonController,
                decoration: const InputDecoration(labelText: 'Reason', border: OutlineInputBorder()),
                maxLines: 3,
                validator: (val) => (val == null || val.isEmpty) ? 'Please enter a reason' : null,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
                child: _isSubmitting ? const CircularProgressIndicator() : const Text('Apply Leave'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
