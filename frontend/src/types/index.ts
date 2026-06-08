// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  company_name: string;
  company_slug: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  message: string;
  user_id: string;
  org_id: string;
  role: string;
  first_name?: string;
  tour_completed?: boolean;
  grace_warning?: string | null;
  onboarding_completed?: boolean;
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'rep' | 'viewer';

export interface User {
  id: string;
  org_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  job_title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  tour_completed: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

export interface UserInvite {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  job_title?: string;
  password: string;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  job_title?: string;
  avatar_url?: string;
}

// ─── Organization ────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'grace' | 'suspended';
  plan: 'starter' | 'growth' | 'enterprise';
  sub_end: string | null;
  grace_until: string | null;
  max_users: number;
  modules: {
    pipeline: boolean;
    reports: boolean;
    activities: boolean;
    files: boolean;
    whatsapp: boolean;
    email: boolean;
  };
  logo_url: string | null;
  industry: string | null;
  company_size: string | null;
  created_at: string;
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export type LifecycleStage = 'lead' | 'prospect' | 'customer' | 'churned' | 'deleted';

export interface Contact {
  id: string;
  org_id: string;
  owner_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  lifecycle_stage: LifecycleStage;
  lead_score: number;
  source: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  last_activity_at: string | null;
  created_at: string | null;
}

export interface ContactCreate {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  lifecycle_stage?: LifecycleStage;
  lead_score?: number;
  source?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

export interface ContactUpdate extends Partial<ContactCreate> {}

export interface ContactListResponse {
  contacts: Contact[];
  total: number;
  next_cursor: string | null;
  has_more: boolean;
}

// ─── Deal ─────────────────────────────────────────────────────────────────────

export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  id: string;
  org_id: string;
  contact_id: string;
  owner_id: string;
  title: string;
  value: number | null;
  stage: DealStage;
  expected_close: string | null;
  probability: number;
  lost_reason: string | null;
  created_at: string | null;
}

export interface DealCreate {
  contact_id: string;
  title: string;
  value?: number;
  stage?: DealStage;
  expected_close?: string;
  probability?: number;
  lost_reason?: string;
}

export interface DealUpdate extends Partial<DealCreate> {}

export interface DealStageUpdate {
  stage: DealStage;
  lost_reason?: string;
}

export interface DealListResponse {
  deals: Deal[];
  total: number;
  next_cursor: string | null;
  has_more: boolean;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export type ActivityType = 'call' | 'email' | 'note' | 'meeting' | 'task' | 'message';

export interface Activity {
  id: string;
  org_id: string;
  contact_id: string;
  deal_id: string | null;
  user_id: string;
  type: ActivityType;
  title: string;
  body: string | null;
  created_at: string | null;
}

export interface ActivityCreate {
  contact_id: string;
  deal_id?: string;
  type: ActivityType;
  title: string;
  body?: string;
}

export interface ActivityUpdate {
  title?: string;
  body?: string;
}

export interface ActivityListResponse {
  activities: Activity[];
  total: number;
  next_cursor: string | null;
  has_more: boolean;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface OverviewStats {
  total_contacts: number;
  total_deals: number;
  total_revenue: number;
  won_deals: number;
  lost_deals: number;
  win_rate: number;
  active_users: number;
  new_contacts_this_month: number;
}

export interface PipelineStage {
  stage: DealStage;
  count: number;
  value: number;
}

export interface ActivitySummary {
  type: ActivityType;
  this_week: number;
  last_week: number;
}

export interface RevenueMonth {
  month: string;
  revenue: number;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export interface BillingRecord {
  id: string;
  org_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  plan: string;
  status: 'pending' | 'paid' | 'failed';
  period_start: string | null;
  period_end: string | null;
  created_at: string | null;
}

export interface BillingStatus {
  plan: string;
  status: string;
  sub_end: string | null;
  grace_until: string | null;
  max_users: number;
  modules: Organization['modules'];
}

// ─── File ────────────────────────────────────────────────────────────────────

export interface FileRecord {
  id: string;
  org_id: string;
  contact_id: string | null;
  deal_id: string | null;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string | null;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface ContactFilters {
  search?: string;
  lifecycle_stage?: string;
  owner_id?: string;
  source?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export interface DealFilters {
  stage?: DealStage;
  owner_id?: string;
  contact_id?: string;
  min_value?: number;
  max_value?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export interface ActivityFilters {
  contact_id?: string;
  deal_id?: string;
  type?: ActivityType;
  cursor?: string;
  limit?: number;
}

// ─── Auth Store ──────────────────────────────────────────────────────────────

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  org: Organization | null;
}
