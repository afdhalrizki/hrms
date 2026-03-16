"""
Custom admin 0001_initial migration that depends on core.0001_initial first.
This ensures core_user table is created before admin tries to reference it.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        # core MUST run first so core_user table exists
        ('core', '0001_initial'),
        ('contenttypes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='LogEntry',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('action_time', models.DateTimeField(auto_now=True, verbose_name='action time')),
                ('object_id', models.TextField(null=True, blank=True, verbose_name='object id')),
                ('object_repr', models.CharField(max_length=200, verbose_name='object repr')),
                ('action_flag', models.PositiveSmallIntegerField(verbose_name='action flag')),
                ('change_message', models.TextField(blank=True, verbose_name='change message')),
                ('content_type', models.ForeignKey(
                    on_delete=django.db.models.deletion.SET_NULL,
                    blank=True,
                    null=True,
                    to='contenttypes.contenttype',
                    verbose_name='content type',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='core.user',
                    verbose_name='user',
                )),
            ],
            options={
                'ordering': ['-action_time'],
                'db_table': 'django_admin_log',
                'verbose_name': 'log entry',
                'verbose_name_plural': 'log entries',
            },
        ),
    ]
