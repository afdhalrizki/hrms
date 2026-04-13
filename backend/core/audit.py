from django.forms.models import model_to_dict
from django.db import models
from django.conf import settings

class AuditModel(models.Model):
    """Abstract base model that provides standard audit fields."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, blank=True, 
        on_delete=models.SET_NULL, 
        related_name="%(app_label)s_%(class)s_created"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, blank=True, 
        on_delete=models.SET_NULL, 
        related_name="%(app_label)s_%(class)s_updated"
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        user = kwargs.pop('user', getattr(self, '_audit_user', None))
        if user is not None and user.is_authenticated:
            if self.pk is None:
                self.created_by = user
            self.updated_by = user
        super().save(*args, **kwargs)

class AuditLogger:
    @staticmethod
    def log_change(action_type, instance, actor=None, ip_address=None):
        """
        Logs a CREATE, UPDATE, or DELETE action with a diff of changes.
        """
        model_name = instance.__class__.__name__
        object_id = str(instance.pk)
        
        changed_fields = {}
        
        try:
            if action_type == 'UPDATE' and hasattr(instance, '_old_values'):
                # Calculate diff
                new_values = model_to_dict(instance)
                for field, old_val in instance._old_values.items():
                    new_val = new_values.get(field)
                    if str(old_val) != str(new_val): # Stringify for safer comparison
                        changed_fields[field] = {
                            'old': str(old_val),
                            'new': str(new_val)
                        }
            elif action_type == 'CREATE':
                # Use model_to_dict for initial capture
                fields_dict = model_to_dict(instance)
                # Convert all values to string for JSON storage and easier search
                changed_fields = {k: str(v) for k, v in fields_dict.items() if v is not None}
                
                # Explicitly ensure searchable identifiers are present (even if not in model_to_dict)
                if hasattr(instance, 'name') and instance.name:
                    changed_fields['name'] = str(instance.name)
                if hasattr(instance, 'fullname') and instance.fullname:
                    changed_fields['fullname'] = str(instance.fullname)

            if action_type == 'DELETE' or changed_fields:
                from .models import AuditLog
                AuditLog.objects.create(
                    action_type=action_type,
                    model_name=model_name,
                    object_id=object_id,
                    changed_fields=changed_fields,
                    actor=actor if actor and actor.is_authenticated else None,
                    ip_address=ip_address
                )
        except Exception as e:
            # Silence audit errors to prevent breaking the main transaction, 
            # but log them for debugging
            print(f"AuditLogger Error: {str(e)}")


class AuditModelMixin:
    """
    Mixin for ViewSets to automatically log actions.
    """
    def perform_create(self, serializer):
        instance = serializer.save()
        AuditLogger.log_change('CREATE', instance, actor=self.request.user)

    def perform_update(self, serializer):
        # Store old values from the instance attached to the serializer
        instance = serializer.instance
        instance._old_values = model_to_dict(instance)
        
        # Save the update
        serializer.save()
        
        # Log the change
        AuditLogger.log_change('UPDATE', instance, actor=self.request.user)

    def perform_destroy(self, instance):
        AuditLogger.log_change('DELETE', instance, actor=self.request.user)
        instance.delete()
