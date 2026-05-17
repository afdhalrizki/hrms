from rest_framework import serializers
from .models import KPI, KPITarget, Appraisal, AppraisalReview

class KPISerializer(serializers.ModelSerializer):
    class Meta:
        model = KPI
        fields = '__all__'

class KPITargetSerializer(serializers.ModelSerializer):
    kpi_name = serializers.ReadOnlyField(source='kpi.name')
    unit = serializers.ReadOnlyField(source='kpi.unit')
    current_value = serializers.ReadOnlyField(source='actual_value')
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    status = serializers.SerializerMethodField()
    weight = serializers.IntegerField(default=25, read_only=True) # Mocked weight

    class Meta:
        model = KPITarget
        fields = '__all__'

    def get_status(self, obj):
        if obj.actual_value >= obj.target_value:
            return 'COMPLETED'
        return 'IN_PROGRESS'

class AppraisalReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.ReadOnlyField(source='reviewer.fullname')

    class Meta:
        model = AppraisalReview
        fields = '__all__'

    def validate(self, data):
        request = self.context.get('request')
        is_staff = request and request.user and request.user.is_staff
        
        appraisal = data.get('appraisal')
        reviewer = data.get('reviewer')
        reviewer_type = data.get('reviewer_type')

        if is_staff:
            return data

        if reviewer_type == 'MANAGER':
            # Check if reviewer is the supervisor of the appraisal employee
            # OR if the reviewer has 'tenant_manage_performance' permission
            is_supervisor = appraisal.employee.supervisor == reviewer
            
            has_perm = False
            if reviewer.access_role and reviewer.access_role.permissions.get('tenant_manage_performance'):
                has_perm = True
            
            if not is_supervisor and not has_perm:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only supervisors or performance managers can submit MANAGER reviews.")
        
        elif reviewer_type == 'SELF':
            if appraisal.employee != reviewer:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("SELF reviews must be submitted by the appraisal owner.")

        return data

class AppraisalSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    reviews = AppraisalReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Appraisal
        fields = '__all__'
