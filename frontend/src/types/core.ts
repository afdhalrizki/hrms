export interface Branch {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  timezone: string;
}

export type WorkflowType = 'LEAVE' | 'OVERTIME' | 'REIMBURSEMENT';
export type ApproverType = 'SUPERVISOR' | 'ROLE' | 'EMPLOYEE';
export type WorkflowStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WorkflowStage {
  id: string;
  name: string;
  sequence: number;
  approver_type: ApproverType;
  approver_role?: string;
  approver_role_name?: string;
  approver_employee?: string;
  approver_employee_name?: string;
}

export interface WorkflowConfig {
  id: string;
  model_type: WorkflowType;
  is_active: boolean;
  stages: WorkflowStage[];
}

export interface WorkflowAction {
  id: string;
  target_model: string;
  target_id: string;
  stage: string;
  stage_name: string;
  actor: string;
  actor_name: string;
  action: WorkflowStatus;
  comment: string;
  created_at: string;
}
