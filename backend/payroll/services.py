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
        cap_wage = min(wage, BPJSManager.KESEHATAN_MAX_WAGE)
        return {
            'company': (cap_wage * Decimal('0.04')).quantize(Decimal('1')),
            'employee': (cap_wage * Decimal('0.01')).quantize(Decimal('1'))
        }

    @staticmethod
    def calculate_employment(wage: Decimal, jkk_rate: Decimal = Decimal('0.0024')) -> Dict[str, Dict[str, Decimal]]:
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

    def run(self) -> Payslip:
        # 1. Base Salary from Golongan
        basic = self.employee.golongan.base_salary
        self.gross_pay += basic
        self.details.append({
            'description': 'Gaji Pokok',
            'amount': basic,
            'is_deduction': False
        })

        # 2. BPJS Calculations
        from django.db import connection
        tenant = connection.tenant
        
        health = BPJSManager.calculate_health(basic)
        employment = BPJSManager.calculate_employment(basic, jkk_rate=getattr(tenant, 'jkk_rate', Decimal('0.0024')))

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
            date__range=(self.period.start_date, self.period.end_date),
            status='APPROVED'
        )
        total_overtime_hours = sum(ot.hours for ot in approved_overtimes)
        
        if total_overtime_hours > 0:
            # Precedence: Grade Rate > Tenant Rate > Divisor Formula
            from django.db import connection
            tenant = connection.tenant
            
            if self.employee.golongan and self.employee.golongan.overtime_rate > 0:
                hourly_rate = self.employee.golongan.overtime_rate
            elif getattr(tenant, 'overtime_rate', 0) > 0:
                hourly_rate = tenant.overtime_rate
            else:
                divisor = Decimal(str(getattr(tenant, 'payroll_overtime_divisor', 173)))
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
            date__range=(self.period.start_date, self.period.end_date),
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
        
        # 6. Net Salary
        self.net_pay = self.gross_pay - self.total_deductions

        # 6. Commit to DB
        payslip = Payslip.objects.create(
            employee=self.employee,
            period=self.period,
            basic_salary=basic,
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
