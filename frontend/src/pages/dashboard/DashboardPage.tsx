import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, TrendingUp, ArrowRight, ArrowUpRight, ArrowDownRight,
  Target, Plus, Activity, CheckSquare, MessageSquare, Phone,
  Mail, FileText, CheckCircle2, Circle, Inbox, Clock, BarChart3, ChevronRight,
  ChevronDown, UserPlus, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { analyticsApi } from '../../api/analytics';
import { activitiesApi } from '../../api/activities';
import { contactsApi } from '../../api/contacts';
import { formatCurrency, formatNumber, timeAgo, STAGE_LABELS } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

// ─── Theme / Chart Constants ──────────────────────────────────────────────────

const CHART_COLORS = {
  primary: '#6366F1',      // Indigo
  primaryLight: '#818CF8',
  success: '#10B981',      // Emerald
  successLight: '#34D399',
  warning: '#F59E0B',      // Amber
  danger: '#EF4444',       // Red
  blue: '#3B82F6',         // Blue
  orange: '#F97316',       // Orange
  cyan: '#06B6D4',
  purple: '#A855F7',
};

const PIE_COLORS = ['#6366F1', '#3B82F6', '#F59E0B', '#F97316', '#10B981', '#EF4444'];

const ACTIVITY_LUCIDE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  note: <FileText size={14} />,
  meeting: <Users size={14} />,
  task: <CheckSquare size={14} />,
  message: <MessageSquare size={14} />,
};

const ACTIVITY_COLOR_SCHEMES: Record<string, string> = {
  call: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  email: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  note: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  meeting: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  task: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  message: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

// Sparkline Mock Data for KPI cards visual enhancement
const MOCK_SPARKLINE_DATA = [{ val: 30 }, { val: 40 }, { val: 35 }, { val: 50 }, { val: 45 }, { val: 60 }, { val: 55 }, { val: 70 }];
const MOCK_SPARKLINE_DATA_2 = [{ val: 50 }, { val: 45 }, { val: 60 }, { val: 55 }, { val: 70 }, { val: 65 }, { val: 80 }, { val: 95 }];
const MOCK_SPARKLINE_DATA_3 = [{ val: 10 }, { val: 25 }, { val: 20 }, { val: 45 }, { val: 30 }, { val: 60 }, { val: 50 }, { val: 85 }];
const MOCK_SPARKLINE_DATA_4 = [{ val: 40 }, { val: 50 }, { val: 48 }, { val: 65 }, { val: 60 }, { val: 75 }, { val: 70 }, { val: 90 }];

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-elevated/95 backdrop-blur-md border border-surface-border rounded-xl p-3.5 shadow-elevated">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2.5 text-xs py-0.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-text-muted capitalize">{p.name === 'this_week' ? 'This Week' : p.name === 'last_week' ? 'Last Week' : p.name}:</span>
            <span className="font-bold text-text-primary">
              {p.name === 'revenue' ? formatCurrency(p.value) : formatNumber(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Dashboard Skeleton Loader ────────────────────────────────────────────────

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      {/* Header Skeleton */}
      <div className="bg-bg-card/90 border border-surface-border rounded-2xl p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-bg-elevated rounded" />
          <div className="h-6 w-48 bg-bg-elevated rounded-xl" />
          <div className="h-4.5 w-64 bg-bg-elevated rounded" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-44 bg-bg-elevated rounded-xl" />
          <div className="h-9 w-28 bg-bg-elevated rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-bg-card/45 border border-surface-border/40 rounded-2xl p-5 flex flex-col justify-between" />
        ))}
      </div>

      {/* Main Grid Skeletons */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="h-80 bg-bg-card/45 border border-surface-border/40 rounded-2xl p-6" />
          <div className="h-96 bg-bg-card/45 border border-surface-border/40 rounded-2xl p-6" />
        </div>
        <div className="space-y-6">
          <div className="h-64 bg-bg-card/45 border border-surface-border/40 rounded-2xl p-6" />
          <div className="h-80 bg-bg-card/45 border border-surface-border/40 rounded-2xl p-6" />
        </div>
      </div>
    </div>
  );
};

// ─── KPI Card Widget Component ────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  sparklineColor: string;
  sparklineData: { val: number }[];
}

const KPICard: React.FC<KPICardProps> = ({
  title, value, icon, iconBg, subtitle, change, changeLabel, sparklineColor, sparklineData
}) => (
  <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-bg-card/45 backdrop-blur-md p-5 transition-all duration-300 hover:-translate-y-[2px] hover:shadow-card hover:border-primary-500/25 group flex flex-col justify-between min-h-[145px]">
    <div className="flex items-start justify-between relative z-10">
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-600 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-semibold text-text-primary tracking-tight leading-none pt-1">{value}</p>
      </div>
      <div className={clsx('p-2.5 rounded-xl transition-all duration-300 group-hover:scale-105 shadow-sm border border-surface-border/40', iconBg)}>
        {icon}
      </div>
    </div>

    {/* Recharts background sparkline */}
    <div className="absolute bottom-0 left-0 right-0 h-11 pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-300">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`kpiG-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="val"
            stroke={sparklineColor}
            strokeWidth={1.5}
            fill={`url(#kpiG-${title.replace(/\s+/g, '')})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border/40 relative z-10">
      {change !== undefined ? (
        <div className="flex items-center gap-1.5">
          <div className={clsx(
            'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md border',
            change > 0
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10'
              : change < 0
                ? 'text-red-400 bg-red-500/10 border-red-500/10'
                : 'text-text-muted bg-bg-hover border-surface-border'
          )}>
            {change > 0 ? <ArrowUpRight size={10} /> : change < 0 ? <ArrowDownRight size={10} /> : null}
            {change > 0 ? '+' : ''}{change}
          </div>
          <p className="text-[10px] text-text-muted font-medium">{changeLabel}</p>
        </div>
      ) : (
        <p className="text-[10px] text-text-muted font-medium truncate max-w-full">{subtitle}</p>
      )}
    </div>
  </div>
);

// ─── Custom Pie Label ─────────────────────────────────────────────────────────

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.45;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Active Date Range Selector
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');

  // Custom Range Dates
  const [customFrom, setCustomFrom] = useState('2026-06-01');
  const [customTo, setCustomTo] = useState('2026-06-30');

  // Unified Actions Dropdown State
  const [actionsOpen, setActionsOpen] = useState(false);

  // Interactive Checklist Tasks Local State
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Follow up with Priya Sharma regarding proposal details', completed: false, priority: 'high' },
    { id: 2, text: 'Call Rohan K. to discuss pricing tiers', completed: false, priority: 'medium' },
    { id: 3, text: 'Prepare demo account for Acme Corporation', completed: true, priority: 'high' },
    { id: 4, text: 'Review lost deals reasons for pipeline analysis', completed: false, priority: 'low' },
  ]);

  const handleToggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Queries
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.overview,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['analytics', 'revenue'],
    queryFn: analyticsApi.revenue,
  });

  const { data: pipelineData } = useQuery({
    queryKey: ['analytics', 'pipeline'],
    queryFn: analyticsApi.pipeline,
  });

  const { data: recentActivities } = useQuery({
    queryKey: ['activities', 'recent'],
    queryFn: () => activitiesApi.list({ limit: 8 }),
  });

  // Fetch contacts to search in activities timeline
  const { data: contacts } = useQuery({
    queryKey: ['contacts', 'select'],
    queryFn: () => contactsApi.list({ limit: 150 }),
  });

  const contactMap = useMemo(() => {
    const map = new Map<string, any>();
    if (contacts?.contacts) {
      contacts.contacts.forEach((c) => map.set(c.id, c));
    }
    return map;
  }, [contacts]);

  // Compute simulated scaling multiplier based on date range selection
  const timeMultiplier = useMemo(() => {
    if (dateRange === 'today') return 0.05;
    if (dateRange === 'week') return 0.25;
    if (dateRange === 'month') return 1.0;
    if (dateRange === 'year') return 4.8;
    if (dateRange === 'custom') {
      try {
        const start = new Date(customFrom).getTime();
        const end = new Date(customTo).getTime();
        const diffTime = Math.max(0, end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        return Math.min(12.0, Math.max(0.05, diffDays / 30));
      } catch {
        return 1.0;
      }
    }
    return 1.0;
  }, [dateRange, customFrom, customTo]);

  // Dynamic KPI visual values
  const scaledLeads = useMemo(() => {
    return Math.ceil((overview?.total_contacts ?? 0) * timeMultiplier);
  }, [overview?.total_contacts, timeMultiplier]);

  const scaledRevenue = useMemo(() => {
    return Math.ceil((overview?.total_revenue ?? 0) * timeMultiplier);
  }, [overview?.total_revenue, timeMultiplier]);

  const scaledActiveDeals = useMemo(() => {
    return Math.ceil((overview?.total_deals ?? 0) * timeMultiplier);
  }, [overview?.total_deals, timeMultiplier]);

  // Handle revenue trend scaling
  const scaledRevenueTrend = useMemo(() => {
    const trend = revenueData?.revenue_trend ?? [];
    let sliced = trend;
    if (dateRange === 'today') {
      sliced = trend.slice(-1);
    } else if (dateRange === 'week') {
      sliced = trend.slice(-3);
    } else if (dateRange === 'month') {
      sliced = trend.slice(-6);
    }
    return sliced.map(item => ({
      ...item,
      revenue: Math.ceil(item.revenue * timeMultiplier)
    }));
  }, [revenueData?.revenue_trend, dateRange, timeMultiplier]);

  // Handle pipeline data scaling
  const scaledPipelineData = useMemo(() => {
    const data = pipelineData?.pipeline ?? [];
    return data.map(stage => ({
      ...stage,
      count: Math.ceil(stage.count * timeMultiplier),
      value: Math.ceil(stage.value * timeMultiplier)
    }));
  }, [pipelineData?.pipeline, timeMultiplier]);

  const pipelineForPie = useMemo(() => {
    return scaledPipelineData
      .filter(s => s.count > 0)
      .map(s => ({ name: s.stage, value: s.count }));
  }, [scaledPipelineData]);

  // Group Recent Activities chronologically
  const recentActivitiesGrouped = useMemo(() => {
    const list = recentActivities?.activities ?? [];
    const groups: { Today: any[]; Yesterday: any[]; Older: any[] } = {
      Today: [],
      Yesterday: [],
      Older: [],
    };

    list.forEach((act) => {
      if (!act.created_at) {
        groups.Older.push(act);
        return;
      }
      try {
        const date = new Date(act.created_at);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
          groups.Today.push(act);
        } else if (diffDays === 1) {
          groups.Yesterday.push(act);
        } else {
          groups.Older.push(act);
        }
      } catch {
        groups.Older.push(act);
      }
    });
    return groups;
  }, [recentActivities]);

  if (overviewLoading) return <DashboardSkeleton />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6 animate-fade-in pb-10 select-none">
      
      {/* Professional Workspace Header Toolbar Banner */}
      <div className="bg-bg-card/95 border border-surface-border rounded-2xl p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-sm relative z-30">
        
        {/* Left: Breadcrumbs & Dynamic Title Summary */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-extrabold uppercase tracking-wider">
            <span>Workspace</span>
            <ChevronRight size={10} />
            <span className="text-primary-400">Dashboard</span>
          </div>
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight">
            {greeting}, {user?.first_name || 'User'}
          </h1>
          <p className="text-text-muted text-xs font-semibold leading-relaxed">
            Performance metrics overview and sales pipelines snapshot.
          </p>
        </div>

        {/* Right: Date period & unified actions */}
        <div className="flex items-center flex-wrap gap-3">
          
          {/* Global Date Range Selector */}
          <div className="flex items-center bg-bg-elevated border border-surface-border rounded-xl p-0.5 shadow-sm">
            {(['today', 'week', 'month', 'year', 'custom'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateRange(period)}
                className={clsx(
                  'px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all',
                  dateRange === period
                    ? 'bg-primary-500/10 text-primary-400 shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {period === 'custom' ? 'Custom' : period}
              </button>
            ))}
          </div>

          {/* Unified Quick Actions Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setActionsOpen(!actionsOpen)}
              className="btn-primary btn-md rounded-xl font-semibold flex items-center gap-1.5 shadow-glow"
            >
              <Zap size={14} className="animate-pulse" />
              Quick Actions
              <ChevronDown size={14} className={clsx('transition-transform duration-200', actionsOpen && 'rotate-180')} />
            </button>

            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-bg-elevated border border-surface-border rounded-xl shadow-elevated z-50 py-1.5 animate-slide-up">
                  <button
                    onClick={() => { navigate('/contacts/new'); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors font-bold"
                  >
                    <Plus size={14} className="text-primary-400" />
                    Add Lead / Contact
                  </button>
                  <button
                    onClick={() => { navigate('/team'); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors font-bold"
                  >
                    <UserPlus size={14} className="text-blue-400" />
                    Add Team Member
                  </button>
                  <button
                    onClick={() => { navigate('/tasks'); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors font-bold"
                  >
                    <CheckSquare size={14} className="text-emerald-400" />
                    Assign Task
                  </button>
                  <button
                    onClick={() => { navigate('/deals'); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors font-bold"
                  >
                    <Briefcase size={14} className="text-amber-400" />
                    Create Deal
                  </button>
                  <button
                    onClick={() => { navigate('/reports'); setActionsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors font-bold"
                  >
                    <BarChart3 size={14} className="text-pink-400" />
                    View Reports
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Inline Custom Date inputs when selected */}
      {dateRange === 'custom' && (
        <div className="flex items-center gap-4 bg-bg-card border border-surface-border rounded-xl px-4 py-3 animate-fade-in shadow-sm max-w-max relative z-20">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase">
            <span>From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-bg-elevated border border-surface-border/50 rounded-lg px-2.5 py-1 text-text-primary outline-none focus:border-primary-500 font-semibold"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase">
            <span>To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-bg-elevated border border-surface-border/50 rounded-lg px-2.5 py-1 text-text-primary outline-none focus:border-primary-500 font-semibold"
            />
          </div>
        </div>
      )}

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Leads"
          value={formatNumber(scaledLeads)}
          icon={<Users size={16} />}
          iconBg="bg-primary-500/10 text-primary-400 border-primary-500/10"
          change={overview?.new_contacts_this_month}
          changeLabel="new this month"
          sparklineColor={CHART_COLORS.primary}
          sparklineData={MOCK_SPARKLINE_DATA}
        />
        <KPICard
          title="Total Revenue"
          value={formatCurrency(scaledRevenue)}
          icon={<TrendingUp size={16} />}
          iconBg="bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
          subtitle={`${overview?.won_deals ?? 0} deals closed`}
          sparklineColor={CHART_COLORS.success}
          sparklineData={MOCK_SPARKLINE_DATA_2}
        />
        <KPICard
          title="Win Rate"
          value={`${overview?.win_rate ?? 0}%`}
          icon={<Target size={16} />}
          iconBg="bg-amber-500/10 text-amber-400 border-amber-500/10"
          subtitle={`${overview?.won_deals ?? 0} won · ${overview?.lost_deals ?? 0} lost`}
          sparklineColor={CHART_COLORS.warning}
          sparklineData={MOCK_SPARKLINE_DATA_3}
        />
        <KPICard
          title="Active Deals"
          value={formatNumber(scaledActiveDeals)}
          icon={<Briefcase size={16} />}
          iconBg="bg-blue-500/10 text-blue-400 border-blue-500/10"
          subtitle={`${overview?.active_users ?? 0} team members active`}
          sparklineColor={CHART_COLORS.blue}
          sparklineData={MOCK_SPARKLINE_DATA_4}
        />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Revenue Trend Area Graph Widget */}
          <div className="card p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Revenue Analytics</h3>
                <p className="text-xs text-text-muted mt-0.5 font-medium">Won deals monthly revenue trend</p>
              </div>
            </div>

            <div className="w-full">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={scaledRevenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" strokeOpacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    dot={{ fill: CHART_COLORS.primary, r: 3.5, strokeWidth: 1.5, stroke: 'var(--color-bg-card)' }}
                    activeDot={{ r: 5, strokeWidth: 1.5, stroke: 'var(--color-bg-card)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline Distribution Donut and Breakdown Side-by-Side */}
          <div className="card p-6">
            <div className="mb-6">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Pipeline Health & Distribution</h3>
              <p className="text-xs text-text-muted mt-0.5 font-semibold font-medium">Active deals analysis and progress across stages</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              {/* Donut Chart (Left 2 columns) */}
              <div className="md:col-span-2 flex flex-col items-center justify-center border-r border-surface-border/30 pr-0 md:pr-4">
                {pipelineForPie.length > 0 ? (
                  <div className="relative w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={pipelineForPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          labelLine={false}
                          label={renderPieLabel}
                          strokeWidth={0}
                        >
                          {pipelineForPie.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0];
                              return (
                                <div className="bg-bg-elevated border border-surface-border rounded-xl p-2.5 shadow-elevated text-[11px] font-semibold">
                                  <span className="text-text-primary capitalize">{STAGE_LABELS[d.name as string] ?? d.name}</span>
                                  <span className="text-text-muted ml-2">{d.value} deals</span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-text-primary">
                        {pipelineForPie.reduce((acc, curr) => acc + curr.value, 0)}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted">Total Deals</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-text-muted text-xs font-semibold">
                    <Inbox size={24} className="text-text-disabled mb-1.5" />
                    No active pipeline
                  </div>
                )}
              </div>

              {/* Progress Breakdown lists (Right 3 columns) */}
              <div className="md:col-span-3 space-y-3.5 pl-0 md:pl-2">
                {scaledPipelineData?.map((stage, i) => {
                  const maxCount = Math.max(1, ...(scaledPipelineData?.map(s => s.count) ?? [1]));
                  const pct = Math.min(100, (stage.count / maxCount) * 100);
                  return (
                    <div key={stage.stage} className="group">
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="font-semibold text-text-secondary capitalize">{STAGE_LABELS[stage.stage]}</span>
                        </div>
                        <div className="flex items-center gap-3 font-semibold">
                          <span className="text-text-primary">{stage.count} {stage.count === 1 ? 'deal' : 'deals'}</span>
                          <span className="text-emerald-400 w-16 text-right font-bold">{formatCurrency(stage.value)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden border border-surface-border/25">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PIE_COLORS[i % PIE_COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">

          {/* Upcoming Tasks Checklist Widget */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare size={13} className="text-primary-400" />
                Upcoming Follow-ups
              </h3>
              <span className="badge bg-primary-500/10 text-primary-400 border-primary-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">
                {tasks.filter(t => !t.completed).length} Pending
              </span>
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={clsx(
                    'flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none text-[11px] font-semibold',
                    task.completed
                      ? 'bg-bg-hover/30 border-surface-border/25 opacity-60'
                      : 'bg-bg-card/30 border-surface-border/50 hover:bg-bg-hover/50 hover:border-surface-muted/60'
                  )}
                >
                  <button className="shrink-0 mt-0.5 text-text-muted hover:text-primary-400 transition-colors">
                    {task.completed ? (
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    ) : (
                      <Circle size={13} className="text-text-disabled" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-text-secondary leading-tight truncate-two-lines', task.completed && 'line-through text-text-muted')}>
                      {task.text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={clsx(
                        'text-[8px] font-bold uppercase px-1 rounded',
                        task.priority === 'high'
                          ? 'text-red-400 bg-red-500/10'
                          : task.priority === 'medium'
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-blue-400 bg-blue-500/10'
                      )}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Chronological Timeline Widget */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={13} className="text-primary-400" />
                  Recent Activity
                </h3>
              </div>
              <button
                onClick={() => navigate('/activities')}
                className="text-[9px] text-primary-400 hover:text-primary-300 flex items-center gap-0.5 transition-colors font-extrabold uppercase tracking-wider"
              >
                View timeline <ArrowRight size={11} />
              </button>
            </div>

            {recentActivities?.activities?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-text-muted">
                <Inbox size={22} className="text-text-disabled mb-2" />
                <p className="text-xs font-semibold">No recent activity</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-500/30 via-surface-border/40 to-surface-border/10" />

                <div className="space-y-4">
                  {Object.entries(recentActivitiesGrouped).map(([groupName, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={groupName} className="space-y-3 relative">
                        {/* Group Header */}
                        <div className="flex items-center gap-2 pl-9">
                          <div className="absolute left-[14px] top-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 border border-bg z-10" />
                          <span className="text-[9px] font-black text-text-muted uppercase tracking-wider leading-none">
                            {groupName}
                          </span>
                        </div>

                        {/* Items in group */}
                        <div className="space-y-2">
                          {items.map((act) => {
                            const contact = contactMap.get(act.contact_id);
                            return (
                              <div
                                key={act.id}
                                onClick={() => act.contact_id && navigate(`/contacts/${act.contact_id}`)}
                                className="group relative flex gap-3 pl-9 items-start cursor-pointer hover:translate-x-0.5 transition-transform"
                              >
                                {/* Timeline icon node */}
                                <div className={clsx(
                                  'absolute left-2 w-5.5 h-5.5 rounded-full border border-surface-border flex items-center justify-center text-xs bg-bg-card shrink-0 transition-all group-hover:scale-105 group-hover:border-primary-500/30 group-hover:shadow-glow',
                                  ACTIVITY_COLOR_SCHEMES[act.type] || 'text-text-muted bg-bg-hover'
                                )}>
                                  {ACTIVITY_LUCIDE_ICONS[act.type] || <Clock size={10} />}
                                </div>

                                <div className="flex-1 min-w-0 py-0.5">
                                  <p className="text-[11px] font-bold text-text-primary group-hover:text-primary-400 transition-colors leading-snug">
                                    {act.title}
                                  </p>
                                  {contact && (
                                    <p className="text-[9px] text-text-muted font-medium flex items-center gap-1 mt-0.5 truncate">
                                      <span>{contact.first_name} {contact.last_name || ''}</span>
                                      {contact.company_name && (
                                        <>
                                          <span className="text-text-disabled/40">•</span>
                                          <span className="truncate">{contact.company_name}</span>
                                        </>
                                      )}
                                    </p>
                                  )}
                                  <p className="text-[8px] text-text-disabled mt-0.5 font-bold flex items-center gap-1">
                                    <Clock size={8} />
                                    {timeAgo(act.created_at ?? undefined)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
