import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'payslip_screen.dart';
import 'schedule_screen.dart';
import 'face_verification_screen.dart';
import 'leave_list_screen.dart';
import 'reimbursement_list_screen.dart';
import '../api/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _userData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final api = ApiService();
      final data = await api.getUserProfile();
      setState(() {
        _userData = data;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading profile: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(child: CircularProgressIndicator(color: Colors.blueAccent)),
      );
    }

    final now = DateTime.now();
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(now);
    final fullName = _userData?['fullname'] ?? 'User';
    final roleName = _userData?['role_name'] ?? 'Staff';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: RefreshIndicator(
        onRefresh: _loadProfile,
        color: Colors.blueAccent,
        child: CustomScrollView(
          slivers: [
            _buildAppBar(context, fullName, roleName),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildWeatherDate(dateStr),
                  const SizedBox(height: 32),
                  _buildAttendanceCard(context, _userData?['employee_id']),
                  const SizedBox(height: 32),
                  _buildSectionHeader("Quick Access"),
                  const SizedBox(height: 16),
                  _buildQuickAccessGrid(context),
                  const SizedBox(height: 32),
                  _buildSectionHeader("Recent Activities"),
                  const SizedBox(height: 16),
                  _buildRecentActivity(),
                ]),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNavigation(context),
    );
  }

  Widget _buildAppBar(BuildContext context, String name, String role) {
    return SliverAppBar(
      expandedHeight: 120,
      backgroundColor: Colors.transparent,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        background: Padding(
          padding: const EdgeInsets.fromLTRB(24, 60, 24, 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back,',
                    style: GoogleFonts.plusJakartaSans(color: Colors.white60, fontSize: 14),
                  ),
                  Text(
                    name,
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const CircleAvatar(
                radius: 28,
                backgroundColor: Colors.white10,
                child: Icon(Icons.person, color: Colors.blueAccent),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWeatherDate(String dateStr) {
    return Row(
      children: [
        const Icon(Icons.calendar_today, size: 16, color: Colors.blueAccent),
        const SizedBox(width: 8),
        Text(
          dateStr,
          style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildAttendanceCard(BuildContext context, int? employeeId) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.blueAccent.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '08:32 AM',
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Text(
                    'Clock In Time',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
              const Icon(Icons.radio_button_checked, color: Colors.white, size: 32),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              const Icon(Icons.location_on, color: Colors.white, size: 14),
              const SizedBox(width: 4),
              const Expanded(
                child: Text(
                  'Head Office, Jakarta Selatan',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text('ON TIME', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const FaceVerificationScreen(isClockIn: false),
                ),
              );
              if (result is Map && result['verified'] == true) {
                try {
                  final now = DateTime.now();
                  final timeStr = DateFormat('HH:mm:ss').format(now);
                  
                  final api = ApiService();
                  await api.submitAttendance(
                    employeeId: employeeId!,
                    latitude: -6.2088, // Mocking center of office for dev
                    longitude: 106.8456,
                    checkInTime: timeStr,
                  );
                  
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Clock in/out successful! (${result['method']})')),
                    );
                    _loadProfile(); // Refresh UI
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to record attendance: $e')),
                    );
                  }
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.blueAccent,
              minimumSize: const Size(double.infinity, 56),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
            child: const Text('Clock Out', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: GoogleFonts.plusJakartaSans(
        color: Colors.white,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildQuickAccessGrid(BuildContext context) {
    final items = [
      {'icon': Icons.calendar_today, 'label': 'Leaves', 'color': const Color(0xFFEF4444)},
      {'icon': Icons.receipt, 'label': 'Payslip', 'color': const Color(0xFF10B981)},
      {'icon': Icons.payments, 'label': 'Reimbursements', 'color': const Color(0xFFF59E0B)},
      {'icon': Icons.description, 'label': 'Reports', 'color': const Color(0xFF6366F1)},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 2.2,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return InkWell(
          onTap: () {
            if (item['label'] == 'Leaves') {
              Navigator.push(context, MaterialPageRoute(builder: (context) => const LeaveListScreen()));
            } else if (item['label'] == 'Payslip') {
              Navigator.push(context, MaterialPageRoute(builder: (context) => const PayslipScreen()));
            } else if (item['label'] == 'Reimbursements') {
              Navigator.push(context, MaterialPageRoute(builder: (context) => const ReimbursementListScreen()));
            }
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: (item['color'] as Color).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(item['icon'] as IconData, color: item['color'] as Color, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  item['label'] as String,
                  style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildRecentActivity() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Activity',
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            TextButton(
              onPressed: () {},
              child: const Text('View All', style: TextStyle(color: Colors.blueAccent)),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildActivityItem(
          icon: Icons.check_circle,
          title: 'Clocked In',
          subtitle: '08:45 AM • Office HQ',
          time: 'Today',
          color: const Color(0xFF10B981),
        ),
        _buildActivityItem(
          icon: Icons.access_time,
          title: 'Leave Request Approved',
          subtitle: 'Annual Leave • 24-25 Feb 2026',
          time: 'Yesterday',
          color: const Color(0xFF6366F1),
        ),
        _buildActivityItem(
          icon: Icons.receipt,
          title: 'Jan 2026 Payslip Available',
          subtitle: 'Rp 8.500.000',
          time: '25 Jan',
          color: const Color(0xFFF59E0B),
        ),
      ],
    );
  }

  Widget _buildActivityItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required String time,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15)),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(color: Colors.white54, fontSize: 13)),
              ],
            ),
          ),
          Text(time, style: const TextStyle(color: Colors.white38, fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(top: 16, bottom: 32),
      decoration: BoxDecoration(
        color: const Color(0xFF0B1120),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(context, Icons.home, true),
          _buildNavItem(context, Icons.calendar_today, false, target: const ScheduleScreen()),
          _buildNavItem(context, Icons.account_balance_wallet, false, target: const PayslipScreen()),
          _buildNavItem(context, Icons.settings, false),
        ],
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, IconData icon, bool isActive, {Widget? target}) {
    return InkWell(
      onTap: () {
        if (target != null) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => target),
          );
        }
      },
      child: Icon(
        icon,
        color: isActive ? Colors.blueAccent : Colors.white24,
        size: 28,
      ),
    );
  }
}
