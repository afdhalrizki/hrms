from decimal import Decimal
import pytest
import sys
import os

# Mock the parts we need from services.py for math verification
class MockEmployee:
    def __init__(self, ptkp_status):
        self.ptkp_status = ptkp_status

from payroll.services import TaxEngine, BPJSManager

def test_bpjs_health_cap():
    salary_15m = Decimal('15000000')
    health = BPJSManager.calculate_health(salary_15m)
    # 1% of 12m (Cap) = 120,000
    assert health['employee'] == Decimal('120000')

def test_bpjs_jp_cap():
    salary_15m = Decimal('15000000')
    employment = BPJSManager.calculate_employment(salary_15m)
    # JP: 1% of 10,042,300 (Cap) = 100,423
    assert employment['jp']['employee'] == Decimal('100423')

def test_bpjs_jkk_rate():
    salary_15m = Decimal('15000000')
    employment = BPJSManager.calculate_employment(salary_15m, jkk_rate=Decimal('0.0174'))
    # JKK: 1.74% of 15m = 261,000
    assert employment['jkk']['company'] == Decimal('261000')


@pytest.mark.parametrize("category, gross, expected_tax", [
    ('A', Decimal('6000000'), Decimal('45000')),
    ('B', Decimal('10000000'), Decimal('175000')),
    ('C', Decimal('10000000'), Decimal('150000')),
])
def test_ter_2024_rates(category, gross, expected_tax):
    rate = TaxEngine.get_ter_rate(category, gross)
    tax = gross * rate
    assert tax == expected_tax

# Removed main entry point for pytest compatibility
