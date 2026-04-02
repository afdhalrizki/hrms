import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/utils/style_utils.dart';
import 'payslip_screen.dart';
import 'schedule_screen.dart';
import 'face_verification_screen.dart';
import 'leave_list_screen.dart';
import 'reimbursement_list_screen.dart';
import 'profile_edit_screen.dart';
import 'profile_documents_screen.dart';
import 'correction_request_screen.dart';
import 'performance_dashboard_screen.dart';
import 'settings_screen.dart';
import '../api/api_service.dart';
import '../api/location_service.dart';
import '../models/activity_model.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _userData;
  List<Activity> _activities = [];
  Map<String, dynamic>? _latestAttendance;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final api = ApiService();
      final user = await api.getUserProfile();

      // Fetch concurrent data
      final results = await Future.wait([
        api.getAttendanceRecords(),
        api.getLeaveRequests(),
        api.getPayslips(),
      ]);

      final List<dynamic> attendance = results[0];
      final List<dynamic> leaves = results[1];
      final List<dynamic> payslips = results[2];

      List<Activity> activities = [];

      // Process Attendance
      for (var record in attendance) {
        activities.add(
          Activity(
            title: "Clocked ${record['check_out'] != null ? 'Out' : 'In'}",
            subtitle:
                "${record['check_in']} • ${record['latitude_in']}, ${record['longitude_in']}",
            time: record['date'] ?? "Today",
            icon: Icons.check_circle,
            color: const Color(0xFF10B981),
            timestamp:
                DateTime.tryParse(record['date'] ?? "") ?? DateTime.now(),
            type: ActivityType.attendance,
          ),
        );
      }

      // Process Leaves
      for (var leave in leaves) {
        activities.add(
          Activity(
            title: "Leave Request ${leave['status']}",
            subtitle: "${leave['leave_type_name']} • ${leave['start_date']}",
            time: leave['created_at'] != null
                ? DateFormat(
                    'd MMM',
                  ).format(DateTime.parse(leave['created_at']))
                : "Recent",
            icon: Icons.access_time,
            color: const Color(0xFF6366F1),
            timestamp:
                DateTime.tryParse(leave['created_at'] ?? "") ?? DateTime.now(),
            type: ActivityType.leave,
          ),
        );
      }

      // Process Payslips
      for (var payslip in payslips) {
        activities.add(
          Activity(
            title: "Payslip ${payslip['period_name']}",
            subtitle:
                "Rp ${NumberFormat('#,###').format(double.tryParse(payslip['net_salary']?.toString() ?? '0'))}",
            time: payslip['paid_at'] != null
                ? DateFormat('d MMM').format(DateTime.parse(payslip['paid_at']))
                : "Recent",
            icon: Icons.receipt,
            color: const Color(0xFFF59E0B),
            timestamp:
                DateTime.tryParse(payslip['paid_at'] ?? "") ?? DateTime.now(),
            type: ActivityType.payslip,
          ),
        );
      }

      // Sort by timestamp desc
      activities.sort((a, b) => b.timestamp.compareTo(a.timestamp));

      setState(() {
        _userData = user;
        _activities = activities.take(5).toList();
        _latestAttendance = attendance.isNotEmpty ? attendance.first : null;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${AppLocalizations.of(context)!.error}: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(
          child: CircularProgressIndicator(color: Colors.blueAccent),
        ),
      );
    }

    final l10n = AppLocalizations.of(context)!;
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
                  _buildAttendanceCard(
                    context,
                    _userData?['employee_id'],
                    l10n,
                  ),
                  const SizedBox(height: 32),
                  _buildSectionHeader(l10n.quickAccess),
                  const SizedBox(height: 16),
                  _buildQuickAccessGrid(context, l10n),
                  const SizedBox(height: 32),
                  _buildSectionHeader(l10n.recentActivities),
                  const SizedBox(height: 16),
                  _buildRecentActivity(l10n),
                ]),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNavigation(context, l10n),
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
                    AppLocalizations.of(context)!.welcome + ",",
                    style: AppTheme.plusJakartaSans(
                      color: Colors.white60,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    name,
                    style: AppTheme.plusJakartaSans(
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
          style: AppTheme.plusJakartaSans(
            color: Colors.white70,
            fontSize: 13,
          ),
        ),
      ],
    );
  }

  Widget _buildAttendanceCard(
    BuildContext context,
    int? employeeId,
    AppLocalizations l10n,
  ) {
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
                    _latestAttendance?['check_in'] ?? '--:--',
                    style: AppTheme.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    AppLocalizations.of(
                      context,
                    )!.clockInTime, // keep as is if context is needed or change to l10n
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
              Icon(
                _latestAttendance != null
                    ? Icons.radio_button_checked
                    : Icons.radio_button_off,
                color: Colors.white,
                size: 32,
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              const Icon(Icons.location_on, color: Colors.white, size: 14),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  l10n.headOffice,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  l10n.onTime,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () async {
              final latest = _latestAttendance;
              final isCurrentlyClockedIn = latest != null && latest['check_out'] == null;
              
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      FaceVerificationScreen(isClockIn: !isCurrentlyClockedIn),
                ),
              );
              if (result is Map && result['verified'] == true) {
                if (employeeId == null) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('User not loaded yet. Please try again.'),
                      ),
                    );
                  }
                  return;
                }

                try {
                  final now = DateTime.now();
                  final timeStr = DateFormat('HH:mm:ss').format(now);

                  // Fetch real GPS location
                  final position = await LocationService().getCurrentLocation();

                  final api = ApiService();
                  await api.submitAttendance(
                    employeeId: employeeId,
                    latitude: position?.latitude ?? -6.2088,
                    longitude: position?.longitude ?? 106.8456,
                    checkInTime: timeStr,
                  );

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Clock in/out successful! (${result['method']})',
                        ),
                      ),
                    );
                    _loadProfile(); // Refresh UI
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Failed to record attendance: $e'),
                      ),
                    );
                  }
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.blueAccent,
              minimumSize: const Size(double.infinity, 56),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 0,
            ),
            child: Text(
              _latestAttendance != null &&
                      _latestAttendance!['check_out'] == null
                  ? l10n.clockOut
                  : l10n.clockIn,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: AppTheme.plusJakartaSans(
        color: Colors.white,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildQuickAccessGrid(BuildContext context, AppLocalizations l10n) {
    final items = [
      {
        'icon': Icons.calendar_today,
        'label': l10n.leaves,
        'color': const Color(0xFFEF4444),
      },
      {
        'icon': Icons.receipt,
        'label': l10n.payslip,
        'color': const Color(0xFF10B981),
      },
      {
        'icon': Icons.payments,
        'label': l10n.reimbursement,
        'color': const Color(0xFFF59E0B),
        'key': 'qa_reimbursement',
      },
      {
        'icon': Icons.person,
        'label': l10n.myProfile,
        'color': const Color(0xFF6366F1),
        'key': 'qa_profile',
      },
      {
        'icon': Icons.badge,
        'label': l10n.documents,
        'color': const Color(0xFF8B5CF6),
      },
      {
        'icon': Icons.edit_calendar,
        'label': l10n.correction,
        'color': const Color(0xFFF43F5E),
        'key': 'qa_correction',
      },
      {
        'icon': Icons.trending_up,
        'label': l10n.performance,
        'color': const Color(0xFF10B981),
        'key': 'qa_performance',
      },
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
            final userData = _userData;
            if (item['label'] == AppLocalizations.of(context)!.leaves) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const LeaveListScreen(),
                ),
              );
            } else if (item['label'] == AppLocalizations.of(context)!.payslip) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const PayslipScreen()),
              );
            } else if (item['label'] ==
                AppLocalizations.of(context)!.reimbursement) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ReimbursementListScreen(),
                ),
              );
            } else if (userData != null &&
                item['label'] == AppLocalizations.of(context)!.myProfile) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => ProfileEditScreen(userData: userData),
                ),
              ).then((_) => _loadProfile());
            } else if (userData != null &&
                item['label'] == AppLocalizations.of(context)!.documents) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      ProfileDocumentsScreen(userData: userData),
                ),
              ).then((_) => _loadProfile());
            } else if (userData != null &&
                item['label'] == AppLocalizations.of(context)!.correction) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      CorrectionRequestScreen(userData: userData),
                ),
              ).then((_) => _loadProfile());
            } else if (userData != null &&
                item['label'] == AppLocalizations.of(context)!.performance) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      PerformanceDashboardScreen(userData: userData),
                ),
              ).then((_) => _loadProfile());
            }
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            key: item['key'] != null ? Key(item['key'] as String) : null,
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
                  child: Icon(
                    item['icon'] as IconData,
                    color: item['color'] as Color,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  item['label'] as String,
                  style: AppTheme.plusJakartaSans(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildRecentActivity(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              l10n.recentActivities,
              style: AppTheme.plusJakartaSans(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {},
              child: Text(
                l10n.viewAll,
                style: const TextStyle(color: Colors.blueAccent),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_activities.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                "No recent activities",
                style: TextStyle(color: Colors.white38),
              ),
            ),
          )
        else
          ..._activities.map(
            (activity) => _buildActivityItem(
              icon: activity.icon,
              title: activity.title,
              subtitle: activity.subtitle,
              time: activity.time,
              color: activity.color,
            ),
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
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(color: Colors.white54, fontSize: 13),
                ),
              ],
            ),
          ),
          Text(
            time,
            style: const TextStyle(
              color: Colors.white38,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation(BuildContext context, AppLocalizations l10n) {
    // Ensure user data is present before requiring it
    final settingsTarget = _userData != null
        ? SettingsScreen(userData: _userData!)
        : null;

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
          _buildNavItem(
            context,
            Icons.calendar_today,
            false,
            target: const ScheduleScreen(),
          ),
          _buildNavItem(
            context,
            Icons.account_balance_wallet,
            false,
            target: const PayslipScreen(),
          ),
          _buildNavItem(context, Icons.settings, false, target: settingsTarget),
        ],
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context,
    IconData icon,
    bool isActive, {
    Widget? target,
  }) {
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
        key: icon == Icons.calendar_today ? const Key('nav_schedule') : 
             icon == Icons.account_balance_wallet ? const Key('nav_payslip') :
             icon == Icons.settings ? const Key('nav_settings') : null,
        color: isActive ? Colors.blueAccent : Colors.white24,
        size: 28,
      ),
    );
  }
}
