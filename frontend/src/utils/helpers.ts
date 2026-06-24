import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

// ─── Date / Time ──────────────────────────────────────────────────────────────

export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '—';
  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return date;
    return format(parsed, 'MMM d, yyyy');
  } catch {
    return date;
  }
};

export const formatDateTime = (date: string | null | undefined): string => {
  if (!date) return '—';
  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return date;
    return format(parsed, 'MMM d, yyyy h:mm a');
  } catch {
    return date;
  }
};

export const timeAgo = (date: string | null | undefined): string => {
  if (!date) return '—';
  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return date;
    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch {
    return date;
  }
};

// ─── Currency ─────────────────────────────────────────────────────────────────

export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number | null | undefined): string => {
  if (value == null) return '0';
  return new Intl.NumberFormat('en-IN').format(value);
};

// ─── Strings ─────────────────────────────────────────────────────────────────

export const getInitials = (firstName: string, lastName?: string | null): string => {
  const first = firstName?.[0]?.toUpperCase() ?? '';
  const last = lastName?.[0]?.toUpperCase() ?? '';
  return `${first}${last}` || '?';
};

export const truncate = (str: string, length = 40): string => {
  if (!str) return '';
  return str.length > length ? `${str.slice(0, length)}...` : str;
};

export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ─── File Size ────────────────────────────────────────────────────────────────

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// ─── Deal Stage Helpers ───────────────────────────────────────────────────────

export const DEAL_STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

export const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export const STAGE_COLORS: Record<string, string> = {
  new: 'text-primary-400 bg-primary-500/10 border-primary-500/30',
  qualified: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  proposal: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  negotiation: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  won: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  lost: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export const STAGE_DOT_COLORS: Record<string, string> = {
  new: 'bg-primary-500',
  qualified: 'bg-blue-500',
  proposal: 'bg-yellow-500',
  negotiation: 'bg-orange-500',
  won: 'bg-emerald-500',
  lost: 'bg-red-500',
};

// ─── Lifecycle Stage ──────────────────────────────────────────────────────────

export const LIFECYCLE_COLORS: Record<string, string> = {
  lead: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  prospect: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  customer: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  churned: 'text-red-400 bg-red-500/10 border-red-500/30',
  deleted: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

// ─── Activity Type ────────────────────────────────────────────────────────────

export const ACTIVITY_ICONS: Record<string, string> = {
  call: '📞',
  email: '✉️',
  note: '📝',
  meeting: '🤝',
  task: '✅',
  message: '💬',
};

export const ACTIVITY_COLORS: Record<string, string> = {
  call: 'text-emerald-400 bg-emerald-500/10',
  email: 'text-blue-400 bg-blue-500/10',
  note: 'text-yellow-400 bg-yellow-500/10',
  meeting: 'text-purple-400 bg-purple-500/10',
  task: 'text-orange-400 bg-orange-500/10',
  message: 'text-pink-400 bg-pink-500/10',
};

// ─── Role ─────────────────────────────────────────────────────────────────────

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-red-400 bg-red-500/10 border-red-500/30',
  admin:       'text-primary-400 bg-primary-500/10 border-primary-500/30',
  manager:     'text-blue-400 bg-blue-500/10 border-blue-500/30',
  developer:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  executive:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  rep:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  viewer:      'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  manager:     'Manager',
  developer:   'Developer',
  executive:   'Executive',
  rep:         'Rep',
  viewer:      'Read-Only',
};

export const DEPARTMENTS = [
  'Sales',
  'Marketing',
  'Operations',
  'Engineering',
  'Management',
  'Support',
];


// ─── Lead Score ───────────────────────────────────────────────────────────────

export const getLeadScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 25) return 'text-orange-400';
  return 'text-red-400';
};
