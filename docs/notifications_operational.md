# Notification Mapping: Operational (Employee & Manager)
Version: 1.0
Status: Proposed

This document maps the daily operational notifications for **Employees** and **Managers** (Supervisors) within the harikerja HRMS platform.

---

## 👤 1. Employee Notifications
Focus: Personal tasks, request statuses, and administrative updates.

| Category | Event | Level | Message |
| :--- | :--- | :--- | :--- |
| **Attendance** | **Clock-in Reminder** | INFO | "Good morning! Don't forget to Clock-in for [Date] to avoid 'Absent' status." |
| **Attendance** | **Clock-out Reminder** | INFO | "The work day is ending. Remember to Clock-out before leaving." |
| **Workflow** | **Request Approved** | SUCCESS | "Your [Leave/Overtime/Correction] request for [Date] has been **Approved**." |
| **Workflow** | **Request Rejected** | ERROR | "Your [Leave/Overtime] request was rejected. Reason: [Comment]." |
| **Payroll** | **Payslip Available** | SUCCESS | "Your payslip for [Month/Year] is now available for download." |
| **Reimbursement** | **Claim Status** | INFO | "Your reimbursement claim for '[Expense Name]' has been [Processed/Paid]." |
| **Leave** | **Balance Update** | INFO | "Your leave balance for the year was updated. You have [X] days remaining." |

---

## 👨‍💼 2. Manager / Supervisor Notifications
Focus: Team oversight and approval workflow management.

| Category | Event | Level | Message |
| :--- | :--- | :--- | :--- |
| **Workflow** | **Pending Approval** | WARNING | "[Employee Name] submitted a [Leave/Overtime] request. Action required." |
| **Attendance** | **Absence Alert** | INFO | "[Employee Name] is marked as **Absent** today (No Clock-in by 09:30)." |
| **Attendance** | **Late Alert** | INFO | "[Employee Name] clocked in late at [Time]." |
| **Performance** | **Review Task** | INFO | "It's time for [Employee Name]'s performance review. Please provide your feedback." |
| **Workflow** | **N-Level Update** | INFO | "Approval Level 1 complete. Request [ID] is now pending HR Department review." |

---

## 📢 3. General & System Announcements
Broadcasts to all active users within the organization.

| Category | Event | Level | Message |
| :--- | :--- | :--- | :--- |
| **Announcement** | **Company News** | INFO | "[Admin Title]: [Message Summary...]" |
| **System** | **Maintenance** | WARNING | "Scheduled maintenance on [Date] at [Time]. The system will be offline for 30 minutes." |
| **Security** | **Tier Upgrade** | SUCCESS | "Company wide: We have upgraded to the [Premium] tier! New modules (Performance) are now active." |

---

## 🛠️ Implementation Notes
- **Channel Delivery**: Push Notifications (Mobile), Web-Socket (Real-time bell), and Email (Daily summaries).
- **Triggers**: Linked to `WorkflowAction` post-save signals.
- **Privacy**: Attendance alerts for Managers should only trigger for their direct subordinates (based on `Employee.supervisor` field).
