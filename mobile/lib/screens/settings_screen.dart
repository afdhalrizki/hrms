import 'package:flutter/material.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';
import 'login_screen.dart';

class SettingsScreen extends StatelessWidget {
  final Map<String, dynamic> userData;

  const SettingsScreen({super.key, required this.userData});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Settings',
          style: AppTheme.plusJakartaSans(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader('Account'),
            const SizedBox(height: 16),
            _buildProfileCard(),
            const SizedBox(height: 32),
            _buildSectionHeader('App Settings'),
            const SizedBox(height: 16),
            _buildSettingItem(
              icon: Icons.language,
              title: 'Language',
              trailing: const Text('English (US)', style: TextStyle(color: Colors.blueAccent)),
              onTap: () {},
            ),
            _buildSettingItem(
              icon: Icons.dark_mode,
              title: 'Dark Mode',
              trailing: Switch(
                value: true,
                onChanged: (val) {},
                activeColor: Colors.blueAccent,
              ),
              onTap: () {},
            ),
            _buildSettingItem(
              icon: Icons.notifications,
              title: 'Notifications',
              onTap: () {},
            ),
            const SizedBox(height: 32),
            _buildSectionHeader('Security'),
            const SizedBox(height: 16),
            _buildSettingItem(
              icon: Icons.lock,
              title: 'Change Password',
              onTap: () {},
            ),
            _buildSettingItem(
              icon: Icons.fingerprint,
              title: 'Biometric Login',
              onTap: () {},
            ),
            const SizedBox(height: 48),
            _buildLogoutButton(context),
            const SizedBox(height: 24),
            Center(
              child: Text(
                'Version 1.1.0-Hardened',
                style: AppTheme.plusJakartaSans(
                  color: Colors.white24,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: AppTheme.plusJakartaSans(
        color: Colors.white60,
        fontSize: 14,
        fontWeight: FontWeight.w600,
        letterSpacing: 1,
      ),
    );
  }

  Widget _buildProfileCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: Colors.blueAccent.withOpacity(0.1),
            child: const Icon(Icons.person, color: Colors.blueAccent, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  userData['fullname'] ?? 'User',
                  style: AppTheme.plusJakartaSans(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  userData['email'] ?? '',
                  style: AppTheme.plusJakartaSans(
                    color: Colors.white54,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'NIK: ${userData['employee_nik'] ?? 'N/A'}',
                  style: AppTheme.plusJakartaSans(
                    color: Colors.blueAccent,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingItem({
    required IconData icon,
    required String title,
    Widget? trailing,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: Colors.white70, size: 20),
        ),
        title: Text(
          title,
          style: AppTheme.plusJakartaSans(
            color: Colors.white,
            fontSize: 15,
          ),
        ),
        trailing: trailing ?? const Icon(Icons.chevron_right, color: Colors.white24),
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        key: const Key('qa_logout_btn'),
        onPressed: () => _handleLogout(context),
        icon: const Icon(Icons.logout),
        label: const Text('Logout'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFEF4444).withOpacity(0.1),
          foregroundColor: const Color(0xFFEF4444),
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFEF4444), width: 1),
          ),
          elevation: 0,
        ),
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Logout', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to logout?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            key: const Key('qa_logout_cancel'),
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(color: Colors.white38)),
          ),
          TextButton(
            key: const Key('qa_logout_confirm'),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final api = ApiService();
      await api.logout();
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }
}
