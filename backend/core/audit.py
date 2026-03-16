"""
core/audit.py
─────────────
Abstract base model that provides four standard audit fields:

    created_at   – when the record was first saved
    updated_at   – when the record was last changed
    created_by   – the User who created the record
    updated_by   – the User who last updated the record

Usage:
    from core.audit import AuditModel

    class MyModel(AuditModel):
        name = models.CharField(max_length=255)
        # created_at, updated_at, created_by, updated_by are inherited automatically

How it auto-fills created_by / updated_by:
    Call  instance.save(user=request.user)  from your ViewSet's perform_create /
    perform_update, OR use the AuditModelMixin for DRF ViewSets (see below).
"""

from django.conf import settings
from django.db import models


class AuditModel(models.Model):
    """Abstract base class adding audit trail fields to any Django model."""

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Dibuat pada")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Diperbarui pada")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_created",
        verbose_name="Dibuat oleh",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="%(app_label)s_%(class)s_updated",
        verbose_name="Diperbarui oleh",
    )

    class Meta:
        abstract = True

    def __init__(self, *args, **kwargs):
        # Pop user from kwargs to avoid "unexpected keyword argument" in model init
        self._audit_user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

    def save(self, *args, **kwargs):
        """
        Override save() to auto-populate created_by / updated_by.
        Supports both:
          1. instance.save(user=request.user)
          2. instance.save() (if user was passed to __init__ via serializer.save(user=user))
        """
        user = kwargs.pop('user', self._audit_user)
        if user is not None:
            if self.pk is None:           # new record
                self.created_by = user
            self.updated_by = user        # always update on every save
        super().save(*args, **kwargs)


# ────────────────────────────────────────────────────────────────────────────
# DRF ViewSet mixin — drop this into any ModelViewSet to auto-pass the user
# ────────────────────────────────────────────────────────────────────────────

class AuditModelMixin:
    """
    DRF ModelViewSet mixin that automatically populates created_by / updated_by.

    Usage:
        class EmployeeViewSet(AuditModelMixin, viewsets.ModelViewSet):
            ...
    """

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)
