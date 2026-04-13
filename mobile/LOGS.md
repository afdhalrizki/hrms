# 📋 Mobile Test Logs Structure

## ✅ Unified Logging System

Semua test logs di mobile sekarang terpusat di **`mobile/logs/`**

### Lokasi Logs

```
mobile/logs/
├── unit_test_*.log           # Unit test logs (79 tests)
├── e2e_test_*.log            # E2E test logs (25 tests)
└── archive/                  # Historical logs (archived)
```

### Naming Convention

- **Unit Tests**: `unit_test_YYYY-MM-DD_HH-mm-ss.log`
- **E2E Tests**: `e2e_test_YYYY-MM-DD_HH-mm-ss.log`

### Scripts Location

```
mobile/scripts/
├── run_unit_tests.mjs        # Logs to: mobile/logs/unit_test_*.log
├── run_e2e_tests.mjs         # Logs to: mobile/logs/e2e_test_*.log
├── run_tests.mjs             # Orchestrator (calls both)
└── manage_logs.mjs           # Log management utility
```

## 🛠️ Log Management

### View Logs

```bash
# List recent logs
node mobile/scripts/manage_logs.mjs list

# List only unit test logs
node mobile/scripts/manage_logs.mjs list unit

# List only e2e test logs
node mobile/scripts/manage_logs.mjs list e2e
```

### Statistics

```bash
# Show log statistics
node mobile/scripts/manage_logs.mjs stats
```

### Archive Old Logs

```bash
# Archive logs older than 7 days
node mobile/scripts/manage_logs.mjs archive 7

# Archive logs older than 30 days
node mobile/scripts/manage_logs.mjs archive 30
```

### Delete Old Logs

```bash
# Delete logs older than 30 days
node mobile/scripts/manage_logs.mjs clear 30

# Delete logs older than 90 days
node mobile/scripts/manage_logs.mjs clear 90
```

## 📊 Current Structure

```
✅ Unit Tests logging to: /mobile/logs/unit_test_*.log
✅ E2E Tests logging to:  /mobile/logs/e2e_test_*.log
✅ Single unified folder for all tests
✅ Consistent timestamp format (YYYY-MM-DD_HH-mm-ss)
✅ Automatic directory creation
```

## 🔄 Workflow

1. **Run Tests** → Logs created in `mobile/logs/`

   ```bash
   node mobile/scripts/run_tests.mjs
   ```

2. **View Recent Logs** → List latest test logs

   ```bash
   node mobile/scripts/manage_logs.mjs list
   ```

3. **Archive Old Logs** → Keep folder clean

   ```bash
   node mobile/scripts/manage_logs.mjs archive
   ```

4. **Check Statistics** → Monitor log count
   ```bash
   node mobile/scripts/manage_logs.mjs stats
   ```

## 📁 .gitignore Entries

Semua log files sudah di-ignore:

```gitignore
mobile/logs/
mobile/e2e/logs/
**/unit_test_*.log
**/e2e_test_*.log
**/*.log
```

---

**Last Updated**: April 13, 2026
