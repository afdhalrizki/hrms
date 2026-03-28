from decimal import Decimal
import pytest
import sys
import os

# Mock the parts we need from services.py for math verification
class MockEmployee:
    def __init__(self, ptkp_status):
        self.ptkp_status = ptkp_status

from payroll.services import TaxEngine, BPJSManager

def test_bpjs_health_capping():
    res = BPJSManager.calculate_health(Decimal('15000000'))
    assert res['employee'] == Decimal('120000')

def test_bpjs_employment_capping():
    res = BPJSManager.calculate_employment(Decimal('11000000'))
    assert res['jp']['employee'] == Decimal('100423')

def test_pph21_ter_rate_lookup():
    assert TaxEngine.get_ter_rate('A', Decimal('10000000')) == Decimal('0.02')

def test_bpjs_health_boundary():
    # Exactly at cap
    health_at = BPJSManager.calculate_health(Decimal('12000000'))
    assert health_at['employee'] == Decimal('120000')
    # Above cap
    health_above = BPJSManager.calculate_health(Decimal('12000001'))
    assert health_above['employee'] == Decimal('120000')

def test_bpjs_jp_boundary():
    # Exactly at cap (JP)
    emp_at = BPJSManager.calculate_employment(Decimal('10042300'))
    assert emp_at['jp']['employee'] == Decimal('100423')
    # Above cap
    emp_above = BPJSManager.calculate_employment(Decimal('10042301'))
    assert emp_above['jp']['employee'] == Decimal('100423')

def test_bpjs_defensive_zero_negative():
    # Zero wage
    z = BPJSManager.calculate_health(Decimal('0'))
    assert z['employee'] == Decimal('0')
    # Negative wage
    n = BPJSManager.calculate_employment(Decimal('-5000000'))
    assert n['jht']['employee'] == Decimal('0')

def test_bpjs_jkk_rate_defensive():
    # 0.0 JKK
    e1 = BPJSManager.calculate_employment(Decimal('1000000'), jkk_rate=0.0)
    assert e1['jkk']['company'] == Decimal('0')
    # String JKK
    e2 = BPJSManager.calculate_employment(Decimal('1000000'), jkk_rate='0.005')
    assert e2['jkk']['company'] == Decimal('5000')
    # Invalid JKK type (should fallback)
    e3 = BPJSManager.calculate_employment(Decimal('1000000'), jkk_rate=None)
    assert e3['jkk']['company'] == Decimal('2400') # Default 0.0024

@pytest.mark.parametrize("category, gross, expected_rate", [
    ('A', Decimal('5400000'), Decimal('0')),
    ('A', Decimal('5400001'), Decimal('0.0025')), # Boundary 5.4m
    ('A', Decimal('5650000'), Decimal('0.0025')),
    ('A', Decimal('5650001'), Decimal('0.005')),  # Boundary 5.65m
    ('A', Decimal('20000000'), Decimal('0.05')),
    ('A', Decimal('30000000'), Decimal('0.10')), # Upper tier
    ('X', Decimal('10000000'), Decimal('0')),    # Invalid Category
])
def test_ter_rate_boundaries(category, gross, expected_rate):
    assert TaxEngine.get_ter_rate(category, gross) == expected_rate

def test_pph21_ptkp_fallback():
    emp = MockEmployee(ptkp_status=None)
    # None status should fallback to 'A' mapping
    tax = TaxEngine.calculate_monthly_pph21(emp, Decimal('10000000'))
    # Category A, 10m -> 2% -> 200,000
    assert tax == Decimal('200000')
