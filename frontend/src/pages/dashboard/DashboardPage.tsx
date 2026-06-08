import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, TrendingUp, Award, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsApi } from '../../api/analytics';
import { activitiesApi } from '../../api/activities';
import { StatCard } from '../../components/ui/StatCard';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatNumber, timeAgo, ACTIVITY_ICONS, ACTIVITY_COLORS, STAGE_LABELS, STAGE_DOT_COLORS } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

const CHART_COLORS = {
  primary: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  orange: '#F97316',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-elevated border border-surface-border rounded-xl p-3 shadow-elevated">
        <p className="text-xs text-text-muted mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {greeting}, {user?.first_name} 👋
          </h1>
          <p className="text-text-muted mt-1">Here's what's happening with your sales today.</p>
        </div>
        <button onClick={() => navigate('/contacts/new')} className="btn-primary btn-md">
          + New Contact
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Contacts"
          value={formatNumber(overview?.total_contacts)}
          icon={<Users size={20} />}
          iconBg="bg-primary-500/10 text-primary-400"
          change={overview?.new_contacts_this_month}
          changeLabel="new this month"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(overview?.total_revenue)}
          icon={<TrendingUp size={20} />}
          iconBg="bg-emerald-500/10 text-emerald-400"
          footer={`${overview?.won_deals} deals won`}
        />
        <StatCard
          title="Win Rate"
          value={`${overview?.win_rate ?? 0}%`}
          icon={<Award size={20} />}
          iconBg="bg-yellow-500/10 text-yellow-400"
          footer={`${overview?.won_deals} won / ${overview?.lost_deals} lost`}
        />
        <StatCard
          title="Active Deals"
          value={formatNumber(overview?.total_deals)}
          icon={<Briefcase size={20} />}
          iconBg="bg-blue-500/10 text-blue-400"
          footer={`${overview?.active_users} team members`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="xl:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-text-primary">Revenue Trend</h3>
              <p className="text-xs text-text-muted mt-0.5">Last 6 months performance</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData?.revenue_trend ?? []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3149" />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: CHART_COLORS.primary, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline by Stage */}
        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-1">Pipeline Stages</h3>
          <p className="text-xs text-text-muted mb-5">Deals by stage</p>
          <div className="space-y-3">
            {pipelineData?.pipeline?.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-3">
                <div className={clsx('w-2 h-2 rounded-full shrink-0', STAGE_DOT_COLORS[stage.stage])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-secondary capitalize">{STAGE_LABELS[stage.stage]}</span>
                    <span className="text-xs font-medium text-text-primary">{stage.count}</span>
                  </div>
                  <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', {
                        'bg-primary-500': stage.stage === 'new',
                        'bg-blue-500': stage.stage === 'qualified',
                        'bg-yellow-500': stage.stage === 'proposal',
                        'bg-orange-500': stage.stage === 'negotiation',
                        'bg-emerald-500': stage.stage === 'won',
                        'bg-red-500': stage.stage === 'lost',
                      })}
                      style={{ width: `${Math.min(100, (stage.count / Math.max(1, ...(pipelineData?.pipeline?.map(s => s.count) ?? [1]))) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-text-muted w-16 text-right">{formatCurrency(stage.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Chart + Recent Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="xl:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-text-primary">Activity Summary</h3>
              <p className="text-xs text-text-muted mt-0.5">This week vs last week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activitiesData?.activities ?? []} barGap={4} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3149" />
              <XAxis dataKey="type" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
              <Bar dataKey="this_week" name="This Week" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
              <Bar dataKey="last_week" name="Last Week" fill="#374151" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity Feed */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Recent Activity</h3>
            <button
              onClick={() => navigate('/activities')}
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivities?.activities?.length === 0 && (
              <p className="text-sm text-text-muted text-center py-6">No activity yet</p>
            )}
            {recentActivities?.activities?.map((act) => (
              <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-bg-hover transition-colors cursor-pointer">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0', ACTIVITY_COLORS[act.type])}>
                  {ACTIVITY_ICONS[act.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{act.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{timeAgo(act.created_at ?? undefined)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
