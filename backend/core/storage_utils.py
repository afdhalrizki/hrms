from django.db.models.fields.files import FieldFile

def get_instance_file_size(instance):
    """
    Dynamically calculates the total size of all FileFields/ImageFields 
    that have a file assigned in a model instance.
    """
    total_size = 0
    # Iterate through only the concrete fields of the model to avoid 
    # reverse relation lookups that can crash during deletion.
    for field in instance._meta.concrete_fields:
        # Check if it's a file-like field
        if hasattr(field, 'upload_to'):
            file_field = getattr(instance, field.name, None)
            if isinstance(file_field, FieldFile) and file_field and hasattr(file_field, 'size'):
                try:
                    total_size += file_field.size
                except (AttributeError, ValueError, FileNotFoundError):
                    # File might not exist on disk or other issues
                    pass
    return total_size
