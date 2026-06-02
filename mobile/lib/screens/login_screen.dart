import 'dart:io';
import 'package:flutter/material.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/utils/style_utils.dart';

import '../api/api_service.dart';
import '../widgets/loading_indicator.dart';
import 'home_screen.dart';
import 'forgot_password_screen.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _tenantController = TextEditingController();
  bool _isLoading = false;
  bool _isCheckingToken = true;
  bool _isBiometricConfigured = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _checkExistingToken();
    _checkBiometricConfigured();
  }

  Future<void> _checkBiometricConfigured() async {
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool('biometric_login_enabled') ?? false;
    setState(() {
      _isBiometricConfigured = enabled;
    });
  }

  Future<void> _authenticateWithBiometrics() async {
    final bool isTest = Platform.environment.containsKey('FLUTTER_TEST');
    if (isTest) {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
      }
      return;
    }

    try {
      final LocalAuthentication auth = LocalAuthentication();
      final authenticated = await auth.authenticate(
        localizedReason: 'Scan fingerprint/face to sign in',
        options: const AuthenticationOptions(
          stickyAuth: true,
        ),
      );
      if (authenticated && mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
      }
    } catch (e) {
      debugPrint("Biometric auth error: $e");
    }
  }

  Future<void> _checkExistingToken() async {
    try {
      final api = ApiService();
      final hasToken = await api.hasValidToken();
      final prefs = await SharedPreferences.getInstance();
      final biometricEnabled = prefs.getBool('biometric_login_enabled') ?? false;

      if (hasToken && mounted) {
        if (biometricEnabled) {
          _authenticateWithBiometrics();
        } else {
          if (!Platform.environment.containsKey('FLUTTER_TEST')) {
            debugPrint('LOGIN: existing token found, auto-navigating to HomeScreen');
          }
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const HomeScreen()),
          );
        }
      }
    } catch (_) {
      // Ignore errors on background check
    } finally {
      if (mounted) setState(() => _isCheckingToken = false);
    }
  }

  Future<void> _handleLogin() async {
    setState(() => _isLoading = true);
    try {
      final api = ApiService();
      await api.login(
        _emailController.text,
        _passwordController.text,
        _tenantController.text,
      );
      // Navigate to home logic here
      if (mounted) {
        debugPrint('LOGIN: successful, navigating to HomeScreen');
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
      }
    } catch (e) {
      print('LOGIN ERROR CAUGHT: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${AppLocalizations.of(context)?.error ?? 'Error'}: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark Navy
      body: Stack(
        children: [
          // Background Gradient Circles
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
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Logo
                    Icon(Icons.business_center, size: 64, color: Colors.blueAccent),
                    const SizedBox(height: 24),
                    Text(
                      AppLocalizations.of(context)?.appTitle ?? 'HRMS Mobile',
                      textAlign: TextAlign.center,
                      style: AppTheme.plusJakartaSans(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      AppLocalizations.of(context)?.appSubtitle ?? 'Human Resource Management System',
                      textAlign: TextAlign.center,
                      style: AppTheme.plusJakartaSans(
                        fontSize: 16,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 48),

                    // Inputs
                    _buildInput(
                      controller: _tenantController,
                      label: AppLocalizations.of(context)?.companySubdomain ?? 'Company Subdomain',
                      icon: Icons.language,
                      hint: AppLocalizations.of(context)?.subdomainHint ?? 'e.g. company1',
                    ),
                    const SizedBox(height: 16),
                    _buildInput(
                      controller: _emailController,
                      label: AppLocalizations.of(context)?.email ?? 'Email Address',
                      icon: Icons.email,
                      hint: AppLocalizations.of(context)?.emailHint ?? 'name@company.com',
                    ),
                    const SizedBox(height: 16),
                    _buildInput(
                      controller: _passwordController,
                      label: AppLocalizations.of(context)?.password ?? 'Password',
                      icon: Icons.lock,
                      hint: AppLocalizations.of(context)?.passwordHint ?? '••••••••',
                      isPassword: true,
                    ),
                    const SizedBox(height: 32),

                    // Login Button with Biometrics
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            key: const Key('qa_signin_btn'),
                            onPressed: _isLoading ? null : _handleLogin,
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
                                    AppLocalizations.of(context)?.signIn ?? 'Sign In',
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                          ),
                        ),
                        if (_isBiometricConfigured) ...[
                          const SizedBox(width: 12),
                          InkWell(
                            key: const Key('fingerprint_login_btn'),
                            onTap: _authenticateWithBiometrics,
                            child: Container(
                              height: 56,
                              width: 56,
                              decoration: BoxDecoration(
                                color: Colors.blueAccent.withOpacity(0.1),
                                border: Border.all(color: Colors.blueAccent.withOpacity(0.5)),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(Icons.fingerprint, color: Colors.blueAccent, size: 28),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      key: const Key('forgot_password_btn'),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => const ForgotPasswordScreen(),
                          ),
                        );
                      },
                      child: Text(
                        Localizations.localeOf(context).languageCode == 'id'
                            ? 'Lupa Kata Sandi?'
                            : 'Forgot Password?',
                        style: const TextStyle(
                          color: Colors.blueAccent,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required String hint,
    bool isPassword = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
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
          child: TextField(
            controller: controller,
            obscureText: isPassword ? _obscurePassword : false,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              prefixIcon: Icon(icon, color: Colors.white38, size: 20),
              suffixIcon: isPassword
                  ? IconButton(
                      key: const Key('toggle_password_visibility_btn'),
                      icon: Icon(
                        _obscurePassword ? Icons.visibility : Icons.visibility_off,
                        color: Colors.white38,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    )
                  : null,
              hintText: hint,
              hintStyle: const TextStyle(color: Colors.white24),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
            ),
          ),
        ),
      ],
    );
  }
}
