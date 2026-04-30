class User {
  final int id;
  final String email;
  final bool isStaff;
  final String role;
  final Map<String, dynamic> permissions;
  final int? employeeId;
  final String? employeeNik;
  final String? fullname;
  final String? roleName;
  final String? departmentName;
  final bool receiveEmailNotifications;

  User({
    required this.id,
    required this.email,
    required this.isStaff,
    required this.role,
    required this.permissions,
    this.employeeId,
    this.employeeNik,
    this.fullname,
    this.roleName,
    this.departmentName,
    this.receiveEmailNotifications = true,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      isStaff: json['is_staff'] ?? false,
      role: json['role'] ?? 'EMPLOYEE',
      permissions: Map<String, dynamic>.from(json['permissions'] ?? {}),
      employeeId: json['employee_id'],
      employeeNik: json['employee_nik'],
      fullname: json['fullname'],
      roleName: json['role_name'] ?? 'Employee',
      departmentName: json['department_name'],
      receiveEmailNotifications: json['receive_email_notifications'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'is_staff': isStaff,
      'role': role,
      'permissions': permissions,
      'employee_id': employeeId,
      'employee_nik': employeeNik,
      'fullname': fullname,
      'role_name': roleName,
      'department_name': departmentName,
      'receive_email_notifications': receiveEmailNotifications,
    };
  }

  /// Checks if the user has a specific RBAC permission.
  /// Staff/Admin always bypass granular checks.
  bool hasPermission(String key) {
    if (isStaff || role == 'SUPERADMIN') return true;
    return permissions[key] == true;
  }
}
