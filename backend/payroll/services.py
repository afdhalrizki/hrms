from decimal import Decimal
from typing import Dict, List, Optional
from .models import SalaryComponent, Payslip, PayslipDetail, PayrollPeriod
from core.models import Employee

class BPJSManager:
    """
    Handles BPJS Kesehatan and Ketenagakerjaan calculations (2024 standards).
    """
    KESEHATAN_MAX_WAGE = Decimal('12000000') 
    KETENAGAKERJAAN_JP_MAX_WAGE = Decimal('10042300') 

    @staticmethod
    def calculate_health(wage: Decimal) -> Dict[str, Decimal]:
        wage = max(Decimal('0'), wage)
        cap_wage = min(wage, BPJSManager.KESEHATAN_MAX_WAGE)
        return {
            'company': (cap_wage * Decimal('0.04')).quantize(Decimal('1')),
            'employee': (cap_wage * Decimal('0.01')).quantize(Decimal('1'))
        }

    @staticmethod
    def calculate_employment(wage: Decimal, jkk_rate: Decimal = Decimal('0.0024')) -> Dict[str, Dict[str, Decimal]]:
        wage = max(Decimal('0'), wage)
        try:
            # Handle None or invalid types by forcing a default
            if jkk_rate is None:
                jkk_rate = Decimal('0.0024')
            else:
                jkk_rate = Decimal(str(jkk_rate))
        except (ValueError, TypeError, Exception): # Broad catch for Decimal conversion failure
            jkk_rate = Decimal('0.0024')
            
        jp_wage = min(wage, BPJSManager.KETENAGAKERJAAN_JP_MAX_WAGE)
        return {
            'jkk': {'company': (wage * jkk_rate).quantize(Decimal('1')), 'employee': Decimal('0')},
            'jkm': {'company': (wage * Decimal('0.003')).quantize(Decimal('1')), 'employee': Decimal('0')},
            'jht': {'company': (wage * Decimal('0.037')).quantize(Decimal('1')), 'employee': (wage * Decimal('0.02')).quantize(Decimal('1'))},
            'jp': {'company': (jp_wage * Decimal('0.02')).quantize(Decimal('1')), 'employee': (jp_wage * Decimal('0.01')).quantize(Decimal('1'))}
        }

class TaxEngine:
    """
    Indonesian PPh 21 Engine implementing TER (Tarif Efektif Rata-rata) 2024.
    """
    CATEGORY_MAPPING = {
        'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A',
        'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B',
        'K/3': 'C'
    }

    @staticmethod
    def get_ter_rate(category: str, gross_monthly: Decimal) -> Decimal:
        if category == 'A':
            if gross_monthly <= 5400000: return Decimal('0')
            if gross_monthly <= 5650000: return Decimal('0.0025')
            if gross_monthly <= 5950000: return Decimal('0.005')
            if gross_monthly <= 6300000: return Decimal('0.0075')
            if gross_monthly <= 6750000: return Decimal('0.01')
            if gross_monthly <= 7500000: return Decimal('0.0125')
            if gross_monthly <= 8550000: return Decimal('0.015')
            if gross_monthly <= 9650000: return Decimal('0.0175')
            if gross_monthly <= 10650000: return Decimal('0.02')
            if gross_monthly <= 12250000: return Decimal('0.0225')
            if gross_monthly <= 14000000: return Decimal('0.025')
            if gross_monthly <= 16000000: return Decimal('0.03')
            # Add more tiers as needed or move to DB
            if gross_monthly <= 20000000: return Decimal('0.05')
            return Decimal('0.10')
        elif category == 'B':
            if gross_monthly <= 6200000: return Decimal('0')
            if gross_monthly <= 6500000: return Decimal('0.0025')
            if gross_monthly <= 6900000: return Decimal('0.005')
            if gross_monthly <= 7300000: return Decimal('0.0075')
            if gross_monthly <= 7800000: return Decimal('0.01')
            if gross_monthly <= 8850000: return Decimal('0.0125')
            if gross_monthly <= 9850000: return Decimal('0.015')
            if gross_monthly <= 10900000: return Decimal('0.0175')
            if gross_monthly <= 20000000: return Decimal('0.03')
            return Decimal('0.09')
        elif category == 'C':
            if gross_monthly <= 6600000: return Decimal('0')
            if gross_monthly <= 6950000: return Decimal('0.0025')
            if gross_monthly <= 7350000: return Decimal('0.005')
            if gross_monthly <= 7800000: return Decimal('0.0075')
            if gross_monthly <= 8350000: return Decimal('0.01')
            if gross_monthly <= 9450000: return Decimal('0.0125')
            if gross_monthly <= 10350000: return Decimal('0.015')
            if gross_monthly <= 20000000: return Decimal('0.02')
            return Decimal('0.08')
        return Decimal('0')

    @staticmethod
    def calculate_monthly_pph21(employee: Employee, gross_salary: Decimal) -> Decimal:
        gross_salary = max(Decimal('0'), gross_salary)
        category = TaxEngine.CATEGORY_MAPPING.get(employee.ptkp_status, 'A')
        rate = TaxEngine.get_ter_rate(category, gross_salary)
        return (gross_salary * rate).quantize(Decimal('1'))

class PayrollCalculator:
    """
    Main orchestrator for generating a detailed Payslip.
    """
    def __init__(self, employee: Employee, period: PayrollPeriod):
        self.employee = employee
        self.period = period
        self.details = []
        self.net_pay = Decimal('0')
        self.gross_pay = Decimal('0')
        self.total_deductions = Decimal('0')

    from django.db import transaction
    @transaction.atomic
    def run(self) -> Payslip:
        # 1. Base Salary from Grade (with Pro-rata for joiners/leavers)
        raw_basic = self.employee.grade.base_salary if self.employee.grade else Decimal('0')
        
        # Ensure dates are date objects (handle potential string inputs from tests/mocks)
        from datetime import date
        from django.utils.dateparse import parse_date
        
        def to_date(d):
            if isinstance(d, str):
                return parse_date(d)
            return d

        p_start = to_date(self.period.start_date)
        p_end = to_date(self.period.end_date)
        e_join = to_date(self.employee.join_date)

        # Calculate pro-rata ratio
        period_days = (p_end - p_start).days + 1
        
        # Effective working days in this period (considering join date)
        effective_start = max(p_start, e_join)
        effective_end = p_end # [TODO] Add support for resignation date
        
        if effective_start > p_end:
            # Joined after this period ends
            basic = Decimal('0')
        elif effective_start > p_start:
            # Joined mid-period
            worked_days = (effective_end - effective_start).days + 1
            ratio = Decimal(str(worked_days)) / Decimal(str(period_days))
            basic = (raw_basic * ratio).quantize(Decimal('1')) # Round to nearest IDR
        else:
            # Active for the full period
            basic = raw_basic

        self.gross_pay += basic
        self.details.append({
            'description': 'Gaji Pokok',
            'amount': basic,
            'is_deduction': False
        })

        # 2. Daily Allowances (Meal & Transport) from Grade
        from attendance.models import Attendance
        attendances = Attendance.objects.filter(
            employee=self.employee,
            date__range=(p_start, p_end)
        )
        days_present = attendances.filter(status='PRESENT').count()
        days_late = attendances.filter(status='LATE').count()
        days_absent = attendances.filter(status='ABSENT').count()
        days_worked = days_present + days_late

        from django.db import connection
        from django_tenants.utils import get_tenant_model
        tenant = get_tenant_model().objects.get(schema_name=connection.schema_name)

        if self.employee.grade:
            meal_allowance = self.employee.grade.meal_allowance * days_worked
            transport_allowance = self.employee.grade.transport_allowance * days_worked
            
            if meal_allowance > 0:
                self.gross_pay += meal_allowance
                self.details.append({'description': f'Tunjangan Makan ({days_worked} hari)', 'amount': meal_allowance, 'is_deduction': False})
            
            if transport_allowance > 0:
                self.gross_pay += transport_allowance
                self.details.append({'description': f'Tunjangan Transport ({days_worked} hari)', 'amount': transport_allowance, 'is_deduction': False})

        # 2.5 Attendance Deductions (Late & Absent)
        from django.db import connection
        from django_tenants.utils import get_tenant_model
        
        # In some test environments, connection.tenant might be a FakeTenant.
        # We try to get the real tenant object to access custom settings.
        try:
            tenant = get_tenant_model().objects.get(schema_name=connection.schema_name)
        except Exception:
            tenant = connection.tenant
            
        late_rate = Decimal(str(getattr(tenant, 'late_deduction_rate', 0)))
        absent_rate = Decimal(str(getattr(tenant, 'absence_deduction_rate', 0)))
        
        late_deduction = late_rate * days_late
        absence_deduction = absent_rate * days_absent
        
        if late_deduction > 0:
            self.total_deductions += late_deduction
            self.details.append({'description': f'Potongan Terlambat ({days_late} kali)', 'amount': late_deduction, 'is_deduction': True})
            
        if absence_deduction > 0:
            self.total_deductions += absence_deduction
            self.details.append({'description': f'Potongan Alpa ({days_absent} hari)', 'amount': absence_deduction, 'is_deduction': True})

        # 3. BPJS Calculations
        from django.db import connection
        tenant = connection.tenant
        
        health = BPJSManager.calculate_health(basic)
        employment = BPJSManager.calculate_employment(basic, jkk_rate=Decimal(str(getattr(tenant, 'jkk_rate', '0.0024'))))

        # Deductions (Employee Portions)
        ee_health = health['employee']
        ee_jht = employment['jht']['employee']
        ee_jp = employment['jp']['employee']
        
        self.total_deductions += (ee_health + ee_jht + ee_jp)
        
        self.details.append({'description': 'Potongan BPJS Kesehatan (1%)', 'amount': ee_health, 'is_deduction': True})
        self.details.append({'description': 'Potongan BPJS JHT (2%)', 'amount': ee_jht, 'is_deduction': True})
        self.details.append({'description': 'Potongan BPJS JP (1%)', 'amount': ee_jp, 'is_deduction': True})

        # 3. Tax Calculation (Simplified Gross-up or Gross)
        tax = TaxEngine.calculate_monthly_pph21(self.employee, self.gross_pay)
        self.total_deductions += tax
        self.details.append({'description': 'PPh 21 (TER)', 'amount': tax, 'is_deduction': True})

        # 4. Overtime Calculation (Approved)
        from attendance.models import Overtime
        approved_overtimes = Overtime.objects.filter(
            employee=self.employee,
            date__range=(p_start, p_end),
            status='APPROVED'
        )
        total_overtime_hours = sum(ot.hours for ot in approved_overtimes)
        
        if total_overtime_hours > 0:
            # Precedence: Grade Rate > Tenant Rate > Divisor Formula
            from django.db import connection
            tenant = connection.tenant
            
            if self.employee.grade and self.employee.grade.overtime_rate > 0:
                hourly_rate = Decimal(str(self.employee.grade.overtime_rate))
            elif getattr(tenant, 'overtime_rate', 0) > 0:
                hourly_rate = Decimal(str(tenant.overtime_rate))
            else:
                divisor = Decimal(str(getattr(tenant, 'payroll_overtime_divisor', 173)))
                if divisor <= 0: divisor = Decimal('173') # Safety fallback
                hourly_rate = basic / divisor
            
            overtime_pay = (hourly_rate * Decimal(str(total_overtime_hours))).quantize(Decimal('1'))
            self.gross_pay += overtime_pay
            self.details.append({
                'description': f'Lembur ({total_overtime_hours} jam)',
                'amount': overtime_pay,
                'is_deduction': False
            })
        else:
            overtime_pay = Decimal('0')

        # 5. Reimbursement Calculation (Approved)
        from reimbursement.models import Reimbursement
        approved_reimbursements = Reimbursement.objects.filter(
            employee=self.employee,
            date__range=(p_start, p_end),
            status='APPROVED'
        )
        total_reimbursement = sum(r.approved_amount or r.amount for r in approved_reimbursements)
        
        if total_reimbursement > 0:
            self.gross_pay += total_reimbursement
            self.details.append({
                'description': f'Reimbursement ({len(approved_reimbursements)} klaim)',
                'amount': total_reimbursement,
                'is_deduction': False
            })

        # 5.5 Custom Salary Components (Bonuses, Loans, Recurring Allowances)
        from django.db import models
        from .models import EmployeeSalaryComponent
        custom_components = EmployeeSalaryComponent.objects.filter(
            employee=self.employee,
            is_active=True
        ).filter(
            models.Q(period=self.period) | models.Q(period__isnull=True)
        )
        
        for esc in custom_components:
            amount = esc.amount
            if esc.component.type == 'ALLOWANCE':
                self.gross_pay += amount
                self.details.append({'description': esc.component.name, 'amount': amount, 'is_deduction': False})
            else:
                self.total_deductions += amount
                self.details.append({'description': esc.component.name, 'amount': amount, 'is_deduction': True})
        
        # 6. Net Salary (Floor to Zero to prevent negative pay)
        self.net_pay = max(Decimal('0'), self.gross_pay - self.total_deductions)

        # 6. Commit to DB
        # Calculate total allowance (excluding basic)
        total_allowance = self.gross_pay - basic
        
        payslip = Payslip.objects.create(
            employee=self.employee,
            period=self.period,
            basic_salary=basic,
            total_allowance=total_allowance,
            total_deduction=self.total_deductions,
            overtime_pay=overtime_pay,
            pph21_tax=tax,
            net_pay=self.net_pay
        )

        for detail in self.details:
            PayslipDetail.objects.create(
                payslip=payslip,
                description=detail['description'],
                amount=detail['amount'],
                is_deduction=detail['is_deduction']
            )

        return payslip
