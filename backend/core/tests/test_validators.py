from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import connection
from unittest.mock import Mock, patch
from core.validators import validate_storage_quota

class StorageQuotaValidatorTestCase(TestCase):
    def test_validate_storage_quota_no_tenant(self):
        # Simulate connection.tenant is None (public schema or script)
        with patch('core.validators.connection') as mock_conn:
            mock_conn.tenant = None
            mock_file = Mock()
            mock_file.size = 1000000000 # 1GB
            
            # Should not raise any error
            validate_storage_quota(mock_file)

    def test_validate_storage_quota_within_limit(self):
        mock_tenant = Mock()
        mock_tenant.storage_limit_mb = 100
        mock_tenant.storage_used_bytes = 0
        mock_tenant.plan_type = 'BASIC'
        
        with patch('core.validators.connection') as mock_conn:
            mock_conn.tenant = mock_tenant
            mock_file = Mock()
            mock_file.size = 50 * 1024 * 1024 # 50MB
            
            # Should not raise error
            validate_storage_quota(mock_file)

    def test_validate_storage_quota_exceeds_limit(self):
        mock_tenant = Mock()
        mock_tenant.storage_limit_mb = 100
        mock_tenant.storage_used_bytes = 80 * 1024 * 1024 # 80MB used
        mock_tenant.plan_type = 'BASIC'
        
        with patch('core.validators.connection') as mock_conn:
            mock_conn.tenant = mock_tenant
            mock_file = Mock()
            mock_file.size = 30 * 1024 * 1024 # 30MB extra -> 110MB total
            
            with self.assertRaisesMessage(ValidationError, "Storage quota exceeded"):
                validate_storage_quota(mock_file)
