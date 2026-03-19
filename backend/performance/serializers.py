from rest_framework import serializers
from .models import KPI, KPITarget, Appraisal, AppraisalReview

class KPISerializer(serializers.ModelSerializer):
    class Meta:
        model = KPI
        fields = '__all__'

class KPITargetSerializer(serializers.ModelSerializer):
    kpi_name = serializers.ReadOnlyField(source='kpi.name')
    employee_name = serializers.ReadOnlyField(source='employee.fullname')

    class Meta:
        model = KPITarget
        fields = '__all__'

class AppraisalReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.ReadOnlyField(source='reviewer.fullname')

    class Meta:
        model = AppraisalReview
        fields = '__all__'

class AppraisalSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.fullname')
    reviews = AppraisalReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Appraisal
        fields = '__all__'
