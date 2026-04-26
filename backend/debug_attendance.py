import os
import django
from pathlib import Path

BACKEND_DIR = Path('/home/afdhal/data/hr/hrms/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from attendance.models import Attendance
from django.utils import timezone
from django_tenants.utils import schema_context

with schema_context('company1'):
    count = Attendance.objects.filter(date=timezone.localdate()).count()
    print(f"Attendance today in company1: {count}")
    for a in Attendance.objects.filter(date=timezone.localdate()):
        print(f"  - {a.employee.email}: {a.status} at {a.check_in}")
