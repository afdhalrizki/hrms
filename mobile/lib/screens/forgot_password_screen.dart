import 'package:flutter/material.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';
import '../widgets/loading_indicator.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _tenantController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _tenantController.dispose();
    super.dispose();
  }

  Future<void> _handleForgotPassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final isIndonesian = Localizations.localeOf(context).languageCode == 'id';
    final successTitle = isIndonesian ? 'Tautan Terkirim' : 'Link Sent';
    final successMsg = isIndonesian
        ? 'Jika email Anda terdaftar, kami telah mengirimkan link untuk mereset kata sandi Anda.'
        : 'If your email is registered, we have sent a link to reset your password.';
    final errorTitle = isIndonesian ? 'Gagal' : 'Failed';

    try {
      final api = ApiService();
      await api.forgotPassword(
        _emailController.text.trim(),
        _tenantController.text.trim(),
      );

      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (BuildContext context) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1E293B),
              title: Text(
                successTitle,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
              content: Text(
                successMsg,
                style: const TextStyle(color: Colors.white70),
              ),
              actions: [
                TextButton(
                  key: const Key('forgot_success_ok_btn'),
                  onPressed: () {
                    Navigator.of(context).pop(); // pop dialog
                    Navigator.of(context).pop(); // go back to login
                  },
                  child: const Text('OK', style: TextStyle(color: Colors.blueAccent)),
                ),
              ],
            );
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$errorTitle: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isIndonesian = Localizations.localeOf(context).languageCode == 'id';
    final title = isIndonesian ? 'Lupa Kata Sandi' : 'Forgot Password';
    final desc = isIndonesian
        ? 'Masukkan subdomain perusahaan dan alamat email Anda untuk menerima instruksi pengaturan ulang kata sandi.'
        : 'Enter your company subdomain and email address to receive password reset instructions.';
    final sendBtn = isIndonesian ? 'Kirim Link Reset' : 'Send Reset Link';
    final subdomainLabel = isIndonesian ? 'SUBDOMAIN PERUSAHAAN' : 'COMPANY SUBDOMAIN';
    final emailLabel = isIndonesian ? 'ALAMAT EMAIL' : 'EMAIL ADDRESS';
    final subdomainHint = AppLocalizations.of(context)?.subdomainHint ?? 'e.g. company1';
    final emailHint = AppLocalizations.of(context)?.emailHint ?? 'name@company.com';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark Navy
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          key: const Key('forgot_back_btn'),
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Stack(
        children: [
          // Background Gradient Circle
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.blue.withOpacity(0.1),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Icon Header
                      const Icon(Icons.lock_reset, size: 72, color: Colors.blueAccent),
                      const SizedBox(height: 24),
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: AppTheme.plusJakartaSans(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        desc,
                        textAlign: TextAlign.center,
                        style: AppTheme.plusJakartaSans(
                          fontSize: 14,
                          color: Colors.white70,
                        ),
                      ),
                      const SizedBox(height: 40),

                      // Subdomain Input
                      _buildInput(
                        key: const Key('forgot_subdomain_input'),
                        controller: _tenantController,
                        label: subdomainLabel,
                        icon: Icons.language,
                        hint: subdomainHint,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return isIndonesian ? 'Subdomain wajib diisi' : 'Subdomain is required';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Email Input
                      _buildInput(
                        key: const Key('forgot_email_input'),
                        controller: _emailController,
                        label: emailLabel,
                        icon: Icons.email,
                        hint: emailHint,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return isIndonesian ? 'Email wajib diisi' : 'Email is required';
                          }
                          if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value.trim())) {
                            return isIndonesian ? 'Format email tidak valid' : 'Invalid email format';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 32),

                      // Submit Button
                      ElevatedButton(
                        key: const Key('forgot_submit_btn'),
                        onPressed: _isLoading ? null : _handleForgotPassword,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueAccent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 0,
                        ).copyWith(
                          overlayColor: WidgetStateProperty.all(Colors.white10),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: AppLoadingIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                sendBtn,
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput({
    required Key key,
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required String hint,
    required String? Function(String?) validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTheme.plusJakartaSans(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.white38,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white10),
          ),
          child: TextFormField(
            key: key,
            controller: controller,
            validator: validator,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              prefixIcon: Icon(icon, color: Colors.white38, size: 20),
              hintText: hint,
              hintStyle: const TextStyle(color: Colors.white24),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(20),
            ),
          ),
        ),
      ],
    );
  }
}
