export type KPIUnit = 'PERCENTAGE' | 'CURRENCY' | 'UNIT';
export type AppraisalStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'COMPLETED';
export type ReviewerType = 'SELF' | 'MANAGER' | 'PEER';

export interface KPI {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: KPIUnit;
}

export interface KPITarget {
  id: string;
  employee: string;
  employee_name: string;
  kpi: string;
  kpi_name: string;
  target_value: number;
  actual_value: number;
  period: string;
}

export interface AppraisalReview {
  id: string;
  appraisal: string;
  reviewer: string;
  reviewer_name: string;
  reviewer_type: ReviewerType;
  ratings: Record<string, number | string>;
  comments: string;
}

export interface Appraisal {
  id: string;
  employee: string;
  employee_name: string;
  period_name: string;
  status: AppraisalStatus;
  start_date: string;
  end_date: string;
  reviews?: AppraisalReview[];
}
