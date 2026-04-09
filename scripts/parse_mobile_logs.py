import json
import glob
import os
import re
import sys

# Detect Project Root (one level up from scripts/)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)

# Ensure mobile/logs exists
log_dir = os.path.join(PROJECT_ROOT, 'mobile', 'logs')
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

OUTPUT_FILE = os.path.join(log_dir, 'exceptions_clean.txt')

logs = glob.glob(os.path.join(log_dir, 'e2e_test_*.log'))
latest_log = max(logs, key=os.path.getctime)

with open(latest_log, "r", encoding="utf-8") as f, open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    in_exception = False
    for line in f:
        try:
            data = json.loads(line)
            if data.get("messageType") == "print":
                msg = data.get("message", "")
                
                # Clean ANSI escapes
                msg = re.sub(r'\x1b\[[0-9;]*m', '', msg)
                
                if "EXCEPTION CAUGHT BY FLUTTER TEST FRAMEWORK" in msg:
                    in_exception = True
                
                if in_exception:
                    out.write(msg + "\n")
                    if "was caught asynchronously" in msg or "when the exception was thrown" in msg.lower():
                        in_exception = False
                        out.write("-" * 50 + "\n")
        except Exception:
            pass
