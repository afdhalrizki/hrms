import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api/api_service.dart';
import '../models/reimbursement_model.dart';

class ReimbursementApplyScreen extends StatefulWidget {
  const ReimbursementApplyScreen({super.key});

  @override
  State<ReimbursementApplyScreen> createState() => _ReimbursementApplyScreenState();
}

class _ReimbursementApplyScreenState extends State<ReimbursementApplyScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  
  List<ReimbursementCategory> _categories = [];
  ReimbursementCategory? _selectedCategory;
  DateTime _date = DateTime.now();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  final TextEditingController _receiptController = TextEditingController();
  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _fetchCategories();
  }

  Future<void> _fetchCategories() async {
    try {
      final categories = await _apiService.getReimbursementCategories();
      if (mounted) {
        setState(() {
          _categories = (categories as List).map((c) => ReimbursementCategory.fromJson(c)).toList();
          if (_categories.isNotEmpty) {
            _selectedCategory = _categories.first;
          }
          _isLoading = false;
        });
        debugPrint('DIAGNOSTIC: Loaded ${_categories.length} reimbursement categories');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading categories: $e')),
        );
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedCategory == null) return;
    
    setState(() => _isSubmitting = true);
    try {
      final data = {
        'category': _selectedCategory!.id,
        'date': DateFormat('yyyy-MM-dd').format(_date),
        'amount': double.parse(_amountController.text),
        'description': _descController.text,
        'receipt_number': _receiptController.text,
      };
      
      await _apiService.applyReimbursement(data);
      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Claim submitted successfully')),
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
      appBar: AppBar(title: const Text('New Reimbursement Claim')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    DropdownButtonFormField<ReimbursementCategory>(
                      value: _selectedCategory,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: _categories.map((c) {
                        return DropdownMenuItem(value: c, child: Text(c.name));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedCategory = val),
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      title: const Text('Date of Expense'),
                      subtitle: Text(DateFormat('yyyy-MM-dd').format(_date)),
                      trailing: const Icon(Icons.calendar_today),
                      onTap: () => _selectDate(context),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      key: const Key('reimb_amount'),
                      controller: _amountController,
                      decoration: const InputDecoration(labelText: 'Amount (IDR)', border: OutlineInputBorder()),
                      keyboardType: TextInputType.number,
                      validator: (val) => (val == null || val.isEmpty) ? 'Please enter amount' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      key: const Key('reimb_description'),
                      controller: _descController,
                      decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                      maxLines: 2,
                      validator: (val) => (val == null || val.isEmpty) ? 'Please enter description' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _receiptController,
                      decoration: const InputDecoration(labelText: 'Receipt # (Optional)', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
                      child: _isSubmitting ? const CircularProgressIndicator() : const Text('Submit Claim'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
