from django.db import models
from django.utils.translation import gettext_lazy as _
from core.audit import AuditModel

class SystemNotification(AuditModel):
    """
    Stores system-wide or per-tenant notifications for admins and employees.
    Used for subscription alerts, system maintenance, etc.
    """
    LEVEL_CHOICES = [
        ('INFO', _('Info')),
        ('WARNING', _('Warning')),
        ('CRITICAL', _('Critical')),
        ('SUCCESS', _('Success')),
    ]

    CATEGORY_CHOICES = [
        ('ADMIN', _('System & Billing')),
        ('OPERATIONAL', _('Employee & Workflow')),
    ]

    title = models.CharField(_("title"), max_length=255)
    message = models.TextField(_("message"))
    level = models.CharField(_("level"), max_length=10, choices=LEVEL_CHOICES, default='INFO')
    category = models.CharField(_("category"), max_length=15, choices=CATEGORY_CHOICES, default='OPERATIONAL')
    is_active = models.BooleanField(_("is active"), default=True)
    expires_at = models.DateTimeField(_("expires at"), null=True, blank=True)
    
    # Optional target: if null, it's global for the tenant
    target_user = models.ForeignKey('users.User', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications', verbose_name=_("target user"))

    class Meta:
        verbose_name = _("system notification")
        verbose_name_plural = _("system notifications")
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.level}] {self.title}"
