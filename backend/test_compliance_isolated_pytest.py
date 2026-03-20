from decimal import Decimal
import pytest

# Isolated copy of the classes for direct math auditing
class BPJSManager:
    KESEHATAN_MAX_WAGE = Decimal('12000000') 
    KETENAGAKERJAAN_JP_MAX_WAGE = Decimal('10042300') 

    @staticmethod
    def calculate_health(wage: Decimal):
        cap_wage = min(wage, BPJSManager.KESEHATAN_MAX_WAGE)
        return {
            'company': (cap_wage * Decimal('0.04')).quantize(Decimal('1')),
            'employee': (cap_wage * Decimal('0.01')).quantize(Decimal('1'))
        }

    @staticmethod
    def calculate_employment(wage: Decimal, jkk_rate: Decimal = Decimal('0.0024')):
        jp_wage = min(wage, BPJSManager.KETENAGAKERJAAN_JP_MAX_WAGE)
        return {
            'jkk': {'company': (wage * jkk_rate).quantize(Decimal('1')), 'employee': Decimal('0')},
            'jkm': {'company': (wage * Decimal('0.003')).quantize(Decimal('1')), 'employee': Decimal('0')},
            'jht': {'company': (wage * Decimal('0.037')).quantize(Decimal('1')), 'employee': (wage * Decimal('0.02')).quantize(Decimal('1'))},
            'jp': {'company': (jp_wage * Decimal('0.02')).quantize(Decimal('1')), 'employee': (jp_wage * Decimal('0.01')).quantize(Decimal('1'))}
        }

class TaxEngine:
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

def test_isolated_health_ee_cap():
    salary_15m = Decimal('15000000')
    health = BPJSManager.calculate_health(salary_15m)
    assert health['employee'] == Decimal('120000')

def test_isolated_jkk_company():
    salary_15m = Decimal('15000000')
    emp_high = BPJSManager.calculate_employment(salary_15m, jkk_rate=Decimal('0.0174'))
    assert emp_high['jkk']['company'] == Decimal('261000')

def test_isolated_jp_ee_cap():
    salary_15m = Decimal('15000000')
    emp_high = BPJSManager.calculate_employment(salary_15m, jkk_rate=Decimal('0.0174'))
    assert emp_high['jp']['employee'] == Decimal('100423')

@pytest.mark.parametrize("category, gross, expected_tax", [
    ('A', Decimal('6000000'), Decimal('45000')),
    ('B', Decimal('10000000'), Decimal('175000')),
    ('C', Decimal('10000000'), Decimal('150000')),
])
def test_isolated_ter_rates(category, gross, expected_tax):
    rate = TaxEngine.get_ter_rate(category, gross)
    assert (gross * rate) == expected_tax

# Removed main entry point for pytest compatibility
