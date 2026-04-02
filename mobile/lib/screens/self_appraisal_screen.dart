import 'package:flutter/material.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';

class SelfAppraisalScreen extends StatefulWidget {
  final Map<String, dynamic> appraisal;
  final Map<String, dynamic> userData;

  const SelfAppraisalScreen({super.key, required this.appraisal, required this.userData});

  @override
  State<SelfAppraisalScreen> createState() => _SelfAppraisalScreenState();
}

class _SelfAppraisalScreenState extends State<SelfAppraisalScreen> {
  final _commentsController = TextEditingController();
  final Map<String, double> _ratings = {
    'productivity': 3,
    'quality': 3,
    'attendance': 3,
    'teamwork': 3,
  };
  bool _isSaving = false;

  Future<void> _submitReview() async {
    setState(() => _isSaving = true);
    try {
      final api = ApiService();
      await api.submitAppraisalReview({
        'appraisal': widget.appraisal['id'],
        'reviewer': widget.userData['employee_id'],
        'reviewer_type': 'SELF',
        'ratings': _ratings,
        'comments': _commentsController.text,
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Self-review submitted!')));
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to submit: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Self Appraisal', style: AppTheme.plusJakartaSans(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Review for ${widget.appraisal['period_name']}',
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 32),
            ..._ratings.keys.map((key) => _buildRatingItem(key)).toList(),
            const SizedBox(height: 32),
            const Text('Comments', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: _commentsController,
              maxLines: 5,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white.withOpacity(0.05),
                hintText: 'Describe your achievements...',
                hintStyle: const TextStyle(color: Colors.white24),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 48),
            ElevatedButton(
              onPressed: _isSaving ? null : _submitReview,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blueAccent,
                minimumSize: const Size(double.infinity, 56),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isSaving 
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Submit Self Review', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRatingItem(String key) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            key.toUpperCase(),
            style: const TextStyle(color: Colors.white60, fontSize: 12, fontWeight: FontWeight.bold),
          ),
          Slider(
            value: _ratings[key]!,
            min: 1,
            max: 5,
            divisions: 4,
            label: _ratings[key]!.round().toString(),
            activeColor: Colors.blueAccent,
            inactiveColor: Colors.white10,
            onChanged: (val) => setState(() => _ratings[key] = val),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text('Poor', style: TextStyle(color: Colors.white24, fontSize: 10)),
              Text('Excellent', style: TextStyle(color: Colors.white24, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }
}
