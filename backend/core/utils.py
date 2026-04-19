from django.db import connection

def tenant_directory_path(instance, filename, prefix=''):
    """
    Base helper for dynamic tenant-specific file uploads.
    """
    schema_name = getattr(connection, 'schema_name', 'public')
    if prefix:
        return f"{schema_name}/{prefix}/{filename}"
    return f"{schema_name}/{filename}"

def ktp_upload_path(instance, filename):
    return tenant_directory_path(instance, filename, prefix='employee_docs/ktp')

def npwp_upload_path(instance, filename):
    return tenant_directory_path(instance, filename, prefix='employee_docs/npwp')

def face_reference_upload_path(instance, filename):
    return tenant_directory_path(instance, filename, prefix='face_references')

def reimbursement_upload_path(instance, filename):
    return tenant_directory_path(instance, filename, prefix='reimbursements')

def attendance_photo_upload_path(instance, filename):
    return tenant_directory_path(instance, filename, prefix='attendance_photos')

def leave_attachment_upload_path(instance, filename):
    return tenant_directory_path(instance, filename, prefix='leave_attachments')
