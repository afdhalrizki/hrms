from django.core.management.base import BaseCommand
from attendance.tasks import check_absences_for_all_tenants

class Command(BaseCommand):
    help = 'Runs the daily absence check task to mark employees as ABSENT if they missed check-in'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date', 
            type=str, 
            help='Target date in YYYY-MM-DD format. Defaults to today.'
        )

    def handle(self, *args, **options):
        date_str = options.get('date')
        result = check_absences_for_all_tenants(date_str=date_str)
        self.stdout.write(self.style.SUCCESS(result))
