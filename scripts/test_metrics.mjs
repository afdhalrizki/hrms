/**
 * UTILITY: Test Metrics Parser
 * Purpose: Verifies that parseMetrics in lib.mjs correctly extracts Unit and E2E counts 
 * from mock logs for all stacks (Backend, Frontend, Mobile).
 * Usage: node scripts/test_metrics.mjs
 */
import { parseMetrics } from './lib.mjs';

const mockLog = `
🧪 [1/2] Running Unit Tests (Pytest)...
== 329 passed, 1 error in 12.3s ==
✅ Unit Tests Passed.

🌐 [2/2] Running E2E Tests (Pytest)...
== 19 passed in 45.6s ==
✅ E2E Tests Passed.

============================================================
           TOTAL HARIKERJA FRONTEND TESTS SUMMARY
============================================================
[Unit Tests]
  Tests   : 187 / 187 (100%)
  Failed  : 0
  Warnings: 0

[E2E Tests]
  Tests   : 58 / 58 (100%)
  Failed  : 0
  Warnings: 0
------------------------------------------------------------
OVERALL SUCCESS: 100%
TOTAL ERRORS   : 0
 STATUS  : ✅ ALL TESTS PASSED
============================================================

========================================
🏁 UNIT TEST SUMMARY (MOBILE INTEGRATED)
========================================
✅ TOTAL PASSED:   135
❌ TOTAL FAILED:   0
⚠️ TOTAL ERRORS:   0
🔍 TOTAL WARNINGS: 0
========================================

========================================
🏁 E2E TEST SUMMARY (MOBILE)
========================================
✅ TOTAL PASSED:   23
❌ TOTAL FAILED:   0
⚠️ TOTAL ERRORS:   0
🔍 TOTAL WARNINGS: 1
========================================
`;

console.log("--- Testing Backend Parsing ---");
console.log(parseMetrics(mockLog, 'Backend Stack'));

console.log("\n--- Testing Frontend Parsing ---");
console.log(parseMetrics(mockLog, 'Frontend Stack'));

console.log("\n--- Testing Mobile Parsing ---");
console.log(parseMetrics(mockLog, 'Mobile Stack'));
