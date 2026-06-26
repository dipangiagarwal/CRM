import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, TrendingUp, ArrowRight, ArrowUpRight,
  CalendarDays, Target,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { analyticsApi } from '../../api/analytics';
import { activitiesApi } from '../../api/activities';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatNumber, timeAgo, ACTIVITY_ICONS, ACTIVITY_COLORS, STAGE_LABELS, STAGE_DOT_COLORS } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

// ─── Chart Constants ────────────────────────────────────────────────────────

const CHART_COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  orange: '#F97316',
  cyan: '#06B6D4',
  purple: '#A855F7',
};

const PIE_COLORS = ['#6366F1', '#3B82F6', '#F59E0B', '#F97316', '#10B981', '#EF4444'];

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-elevated/95 backdrop-blur-md border border-surface-border rounded-xl p-3.5 shadow-elevated">
        <p className="text-xs font-medium text-text-muted mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-text-muted capitalize">{p.name}:</span>
            <span className="font-semibold text-text-primary">
              {p.name === 'revenue' ? formatCurrency(p.value) : formatNumber(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── KPI Stat Card ──────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, gradient, iconBg, subtitle, change, changeLabel }) => (
  <div className={clsx(
    'relative overflow-hidden rounded-2xl border border-surface-border p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group',
    'bg-bg-card'
  )}>
    {/* Gradient accent bar */}
    <div className={clsx('absolute top-0 left-0 right-0 h-1 opacity-80', gradient)} />

    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-extrabold text-text-primary tracking-tight">{value}</p>
      </div>
      <div className={clsx('p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110', iconBg)}>
        {icon}
      </div>
    </div>

    {(change !== undefined || subtitle) && (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-border/50">
        {change !== undefined && (
          <div className={clsx(
            'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
            change > 0 ? 'text-emerald-400 bg-emerald-500/10' : change < 0 ? 'text-red-400 bg-red-500/10' : 'text-text-muted bg-bg-elevated'
          )}>
            {change > 0 && <ArrowUpRight size={11} />}
            {change > 0 ? '+' : ''}{change}
          </div>
        )}
        <p className="text-xs text-text-muted">{changeLabel || subtitle}</p>
      </div>
    )}
  </div>
);

// ─── Custom Pie Label ───────────────────────────────────────────────────────

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {STAGE_LABELS[name] ?? name}
    </text>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

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

  const { data: activitiesData } = useQuery({
    queryKey: ['analytics', 'activities'],
    queryFn: analyticsApi.activities,
  });

  const { data: recentActivities } = useQuery({
    queryKey: ['activities', 'recent'],
    queryFn: () => activitiesApi.list({ limit: 8 }),
  });

  if (overviewLoading) return <PageLoader />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const pipelineForPie = (pipelineData?.pipeline ?? [])
    .filter(s => s.count > 0)
    .map(s => ({ name: s.stage, value: s.count }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            {greeting}, {user?.first_name} 👋
          </h1>
          <p className="text-text-muted text-sm mt-1">Here's your sales performance snapshot for today.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-text-muted bg-bg-elevated px-3 py-1.5 rounded-lg border border-surface-border">
            <CalendarDays size={12} />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <button onClick={() => navigate('/contacts/new')} className="btn-primary btn-md">
            + New Contact
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Leads"
          value={formatNumber(overview?.total_contacts)}
          icon={<Users size={20} />}
          iconBg="bg-primary-500/10 text-primary-400"
          gradient="bg-gradient-to-r from-primary-500 to-primary-400"
          change={overview?.new_contacts_this_month}
          changeLabel="new this month"
        />
        <KPICard
          title="Total Revenue"
          value={formatCurrency(overview?.total_revenue)}
          icon={<TrendingUp size={20} />}
          iconBg="bg-emerald-500/10 text-emerald-400"
          gradient="bg-gradient-to-r from-emerald-500 to-emerald-400"
          subtitle={`${overview?.won_deals ?? 0} deals closed`}
        />
        <KPICard
          title="Win Rate"
          value={`${overview?.win_rate ?? 0}%`}
          icon={<Target size={20} />}
          iconBg="bg-amber-500/10 text-amber-400"
          gradient="bg-gradient-to-r from-amber-500 to-yellow-400"
          subtitle={`${overview?.won_deals ?? 0} won · ${overview?.lost_deals ?? 0} lost`}
        />
        <KPICard
          title="Active Deals"
          value={formatNumber(overview?.total_deals)}
          icon={<Briefcase size={20} />}
          iconBg="bg-blue-500/10 text-blue-400"
          gradient="bg-gradient-to-r from-blue-500 to-cyan-400"
          subtitle={`${overview?.active_users ?? 0} team members active`}
        />
      </div>

      {/* Charts Row 1: Revenue + Pipeline Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="xl:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-text-primary">Revenue Trend</h3>
              <p className="text-xs text-text-muted mt-0.5">Monthly revenue over the last 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary-500" /> Revenue
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData?.revenue_trend ?? []}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
                  <stop offset="50%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" strokeOpacity={0.5} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                dot={{ fill: CHART_COLORS.primary, r: 4, strokeWidth: 2, stroke: 'var(--color-bg-card)' }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--color-bg-card)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Donut Chart */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-1">Pipeline Distribution</h3>
          <p className="text-xs text-text-muted mb-4">Deals across stages</p>

          {pipelineForPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pipelineForPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
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
                          <div className="bg-bg-elevated/95 backdrop-blur-md border border-surface-border rounded-lg p-2.5 shadow-elevated text-xs">
                            <span className="font-semibold text-text-primary capitalize">{STAGE_LABELS[d.name as string] ?? d.name}</span>
                            <span className="text-text-muted ml-2">{d.value} deals</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                {pipelineData?.pipeline?.map((stage, i) => (
                  <div key={stage.stage} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-[11px] text-text-muted truncate capitalize">{STAGE_LABELS[stage.stage]}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-text-primary">{stage.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-text-muted text-sm">
              No pipeline data yet
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Activity Bar Chart + Pipeline Progress Bars + Recent Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="xl:col-span-1 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-text-primary">Activity Summary</h3>
              <p className="text-xs text-text-muted mt-0.5">This week vs last week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activitiesData?.activities ?? []} barGap={3} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" strokeOpacity={0.5} />
              <XAxis
                dataKey="type"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => <span className="text-text-muted text-[11px]">{value}</span>}
              />
              <Bar dataKey="this_week" name="This Week" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="last_week" name="Last Week" fill="var(--color-surface-border)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Progress Bars */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-text-primary mb-1">Pipeline Breakdown</h3>
          <p className="text-xs text-text-muted mb-5">Value by stage</p>
          <div className="space-y-4">
            {pipelineData?.pipeline?.map((stage) => {
              const maxCount = Math.max(1, ...(pipelineData?.pipeline?.map(s => s.count) ?? [1]));
              const pct = Math.min(100, (stage.count / maxCount) * 100);
              return (
                <div key={stage.stage} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={clsx('w-2.5 h-2.5 rounded-sm shrink-0', STAGE_DOT_COLORS[stage.stage])} />
                      <span className="text-xs font-medium text-text-secondary capitalize">{STAGE_LABELS[stage.stage]}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-text-primary">{stage.count}</span>
                      <span className="text-[10px] text-text-muted w-16 text-right">{formatCurrency(stage.value)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500 ease-out', {
                        'bg-gradient-to-r from-primary-500 to-primary-400': stage.stage === 'new',
                        'bg-gradient-to-r from-blue-500 to-blue-400': stage.stage === 'qualified',
                        'bg-gradient-to-r from-yellow-500 to-yellow-400': stage.stage === 'proposal',
                        'bg-gradient-to-r from-orange-500 to-orange-400': stage.stage === 'negotiation',
                        'bg-gradient-to-r from-emerald-500 to-emerald-400': stage.stage === 'won',
                        'bg-gradient-to-r from-red-500 to-red-400': stage.stage === 'lost',
                      })}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-text-primary">Recent Activity</h3>
              <p className="text-xs text-text-muted mt-0.5">Latest updates from your team</p>
            </div>
            <button
              onClick={() => navigate('/activities')}
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors font-medium"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {recentActivities?.activities?.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-text-muted">No activity yet</p>
              </div>
            )}
            {recentActivities?.activities?.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-bg-hover/60 transition-colors cursor-pointer group"
              >
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition-transform duration-200 group-hover:scale-110',
                  ACTIVITY_COLORS[act.type]
                )}>
                  {ACTIVITY_ICONS[act.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{act.title}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{timeAgo(act.created_at ?? undefined)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
