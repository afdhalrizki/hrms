class ReimbursementCategory {
  final int id;
  final String name;
  final double? maxAmount;

  ReimbursementCategory({
    required this.id,
    required this.name,
    this.maxAmount,
  });

  factory ReimbursementCategory.fromJson(Map<String, dynamic> json) {
    return ReimbursementCategory(
      id: json['id'],
      name: json['name'],
      maxAmount: json['max_amount'] != null ? (json['max_amount'] as num).toDouble() : null,
    );
  }
}

class Reimbursement {
  final int? id;
  final int categoryId;
  final String? categoryName;
  final String date;
  final double amount;
  final String description;
  final String status;
  final String? receiptNumber;

  Reimbursement({
    this.id,
    required this.categoryId,
    this.categoryName,
    required this.date,
    required this.amount,
    required this.description,
    this.status = 'PENDING',
    this.receiptNumber,
  });

  factory Reimbursement.fromJson(Map<String, dynamic> json) {
    return Reimbursement(
      id: json['id'],
      categoryId: json['category'] is int ? json['category'] : (json['category']['id'] ?? 0),
      categoryName: json['category_name'] ?? (json['category'] is Map ? json['category']['name'] : null),
      date: json['date'],
      amount: (json['amount'] as num).toDouble(),
      description: json['description'],
      status: json['status'],
      receiptNumber: json['receipt_number'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'category': categoryId,
      'date': date,
      'amount': amount,
      'description': description,
      'receipt_number': receiptNumber,
    };
  }
}
