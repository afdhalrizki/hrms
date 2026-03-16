class User {
  final int id;
  final String email;
  final bool isStaff;
  final int? employeeId;
  final String? employeeNik;
  final String? fullname;
  final String? roleName;
  final String? departmentName;

  User({
    required this.id,
    required this.email,
    required this.isStaff,
    this.employeeId,
    this.employeeNik,
    this.fullname,
    this.roleName,
    this.departmentName,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      isStaff: json['is_staff'] ?? false,
      employeeId: json['employee_id'],
      employeeNik: json['employee_nik'],
      fullname: json['fullname'],
      roleName: json['role_name'],
      departmentName: json['department_name'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'is_staff': isStaff,
      'employee_id': employeeId,
      'employee_nik': employeeNik,
      'fullname': fullname,
      'role_name': roleName,
      'department_name': departmentName,
    };
  }
}
