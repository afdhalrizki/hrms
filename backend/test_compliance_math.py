from decimal import Decimal
import sys
import os

# Mock the parts we need from services.py for math verification
class MockEmployee:
    def __init__(self, ptkp_status):
        self.ptkp_status = ptkp_status

from payroll.services import TaxEngine, BPJSManager

def run_checks():
    print("--- START COMPLIANCE MATH CHECK ---")
    
    # 1. Test BPJS Caps
    print("\n[BPJS CHECK]")
    salary_15m = Decimal('15000000')
    health = BPJSManager.calculate_health(salary_15m)
    # 1% of 12m (Cap) = 120,000
    print(f"Health EE (15m): {health['employee']} | Expected: 120000")
    assert health['employee'] == Decimal('120000')

    employment = BPJSManager.calculate_employment(salary_15m, jkk_rate=Decimal('0.0174'))
    # JP: 1% of 10,042,300 (Cap) = 100,423
    # JKK: 1.74% of 15m = 261,000
    print(f"JP EE (15m): {employment['jp']['employee']} | Expected: 100423")
    print(f"JKK Comp (15m, high risk): {employment['jkk']['company']} | Expected: 261000")
    assert employment['jp']['employee'] == Decimal('100423')
    assert employment['jkk']['company'] == Decimal('261000')

    # 2. Test TER 2024 Rates (Category A, B, C)
    print("\n[TAX ENGINE CHECK (TER 2024)]")
    
    # Cat A (TK/0) @ 6m -> 0.75%
    rate_a = TaxEngine.get_ter_rate('A', Decimal('6000000'))
    tax_a = Decimal('6000000') * rate_a
    print(f"Tax A (6m): {tax_a} (Rate: {rate_a}) | Expected: 45000.00")
    assert tax_a == Decimal('45000')

    # Cat B (K/1) @ 10m -> 1.75%
    rate_b = TaxEngine.get_ter_rate('B', Decimal('10000000'))
    tax_b = Decimal('10000000') * rate_b
    print(f"Tax B (10m): {tax_b} (Rate: {rate_b}) | Expected: 175000.00")
    assert tax_b == Decimal('175000')

    # Cat C (K/3) @ 10m -> 1.5%
    rate_c = TaxEngine.get_ter_rate('C', Decimal('10000000'))
    tax_c = Decimal('10000000') * rate_c
    print(f"Tax C (10m): {tax_c} (Rate: {rate_c}) | Expected: 150000.00")
    assert tax_c == Decimal('150000')

    print("\n--- ALL COMPLIANCE MATH CHECKS PASSED ---")

if __name__ == "__main__":
    # Add project root to sys.path to import from app
    sys.path.append(os.getcwd())
    run_checks()
