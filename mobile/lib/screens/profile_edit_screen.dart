import 'package:flutter/material.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';

class ProfileEditScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const ProfileEditScreen({super.key, required this.userData});

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _phoneController;
  late TextEditingController _addressController;
  late TextEditingController _ktpNumberController;
  late TextEditingController _npwpNumberController;
  String? _ptkpStatus;
  bool _isSaving = false;

  final List<String> _ptkpOptions = [
    'TK/0', 'TK/1', 'TK/2', 'TK/3',
    'K/0', 'K/1', 'K/2', 'K/3',
    'K/I/0', 'K/I/1', 'K/I/2', 'K/I/3'
  ];

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: widget.userData['phone'] ?? '');
    _addressController = TextEditingController(text: widget.userData['address'] ?? '');
    _ktpNumberController = TextEditingController(text: widget.userData['ktp_number'] ?? '');
    _npwpNumberController = TextEditingController(text: widget.userData['npwp_number'] ?? '');
    _ptkpStatus = widget.userData['ptkp_status'];
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _addressController.dispose();
    _ktpNumberController.dispose();
    _npwpNumberController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final api = ApiService();
      final employeeId = widget.userData['employee_id'];
      
      final payload = {
        'phone': _phoneController.text,
        'address': _addressController.text,
        'ktp_number': _ktpNumberController.text,
        'npwp_number': _npwpNumberController.text,
        'ptkp_status': _ptkpStatus,
      };

      await api.updateProfile(employeeId, payload);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update profile: $e')),
        );
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
        title: Text('Edit Profile', style: AppTheme.plusJakartaSans(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionHeader('Personal Information'),
              const SizedBox(height: 16),
              _buildGlassInputField(
                key: const Key('profile_phone'),
                label: 'Phone Number',
                controller: _phoneController,
                icon: Icons.phone,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              _buildGlassInputField(
                key: const Key('profile_address'),
                label: 'Address',
                controller: _addressController,
                icon: Icons.location_on,
                maxLines: 3,
              ),
              const SizedBox(height: 32),
              _buildSectionHeader('Tax & Identity'),
              const SizedBox(height: 16),
              _buildGlassInputField(
                key: const Key('profile_ktp'),
                label: 'KTP Number',
                controller: _ktpNumberController,
                icon: Icons.badge,
              ),
              const SizedBox(height: 16),
              _buildGlassInputField(
                key: const Key('profile_npwp'),
                label: 'NPWP Number',
                controller: _npwpNumberController,
                icon: Icons.account_balance,
              ),
              const SizedBox(height: 16),
              _buildDropdownField(),
              const SizedBox(height: 48),
              _buildSaveButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title.toUpperCase(),
      style: AppTheme.plusJakartaSans(
        color: Colors.white60,
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildGlassInputField({
    Key? key,
    required String label,
    required TextEditingController controller,
    required IconData icon,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
      ),
      child: TextFormField(
        key: key,
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: Colors.white60),
          prefixIcon: Icon(icon, color: Colors.blueAccent, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
        validator: (value) => value == null || value.isEmpty ? 'Field cannot be empty' : null,
      ),
    );
  }

  Widget _buildDropdownField() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButtonFormField<String>(
          value: _ptkpStatus,
          dropdownColor: const Color(0xFF1E293B),
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            labelText: 'PTKP Status',
            labelStyle: TextStyle(color: Colors.white60),
            prefixIcon: Icon(Icons.family_restroom, color: Colors.blueAccent, size: 20),
            border: InputBorder.none,
          ),
          items: _ptkpOptions.map((opt) => DropdownMenuItem(
            value: opt,
            child: Text(opt),
          )).toList(),
          onChanged: (val) => setState(() => _ptkpStatus = val),
          validator: (val) => val == null ? 'Please select status' : null,
        ),
      ),
    );
  }

  Widget _buildSaveButton() {
    return ElevatedButton(
      key: const Key('profile_save_btn'),
      onPressed: _isSaving ? null : _saveProfile,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.blueAccent,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
      child: _isSaving 
        ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
        : const Text('Save Changes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
    );
  }
}
