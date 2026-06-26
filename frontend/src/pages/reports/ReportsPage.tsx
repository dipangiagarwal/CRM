import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { analyticsApi } from '../../api/analytics';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatCurrency, STAGE_LABELS } from '../../utils/helpers';

const STAGE_COLORS_HEX: Record<string, string> = {
  new: '#6366F1',
  qualified: '#3B82F6',
  proposal: '#F59E0B',
  negotiation: '#F97316',
  won: '#10B981',
  lost: '#EF4444',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-elevated border border-surface-border rounded-xl p-3 shadow-elevated text-xs">
        <p className="text-text-muted mb-1.5 font-bold uppercase tracking-wider">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs font-bold py-0.5" style={{ color: p.color }}>
            {p.name}: {p.name.toLowerCase().includes('revenue') || p.name.toLowerCase().includes('value') ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ReportsPage: React.FC = () => {
  const { data: overview, isLoading: ol } = useQuery({ queryKey: ['analytics', 'overview'], queryFn: analyticsApi.overview });
  const { data: revenue, isLoading: rl } = useQuery({ queryKey: ['analytics', 'revenue'], queryFn: analyticsApi.revenue });
  const { data: pipeline, isLoading: pl } = useQuery({ queryKey: ['analytics', 'pipeline'], queryFn: analyticsApi.pipeline });
  const { data: activities, isLoading: al } = useQuery({ queryKey: ['analytics', 'activities'], queryFn: analyticsApi.activities });

  if (ol || rl || pl || al) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Reports & Analytics</h1>
        <p className="text-text-muted mt-0.5 text-xs font-medium">Performance insights for your sales team</p>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(overview?.total_revenue), color: 'text-emerald-400' },
          { label: 'Win Rate', value: `${overview?.win_rate}%`, color: 'text-primary-400' },
          { label: 'Won Deals', value: overview?.won_deals, color: 'text-blue-400' },
          { label: 'Lost Deals', value: overview?.lost_deals, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-extrabold tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      <div className="card p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Revenue Trend</h3>
          <p className="text-xs text-text-muted mt-0.5">Monthly revenue from won deals — last 6 months</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenue?.revenue_trend ?? []} margin={{ left: -20 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366F1" strokeWidth={2} fill="url(#revGrad)" dot={{ fill: '#6366F1', r: 4, strokeWidth: 1.5, stroke: 'var(--color-bg-card)' }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pipeline + Activity Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <div className="card p-6">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Pipeline by Stage</h3>
            <p className="text-xs text-text-muted mt-0.5">Deal count and value per stage</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pipeline?.pipeline?.map(p => ({ ...p, stage: STAGE_LABELS[p.stage] })) ?? []} barSize={16} margin={{ left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="stage" tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Deals" radius={[3, 3, 0, 0]}>
                {pipeline?.pipeline?.map((entry, i) => (
                  <Cell key={i} fill={STAGE_COLORS_HEX[entry.stage] ?? '#6366F1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity This Week vs Last Week */}
        <div className="card p-6">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Activity Comparison</h3>
            <p className="text-xs text-text-muted mt-0.5">This week vs last week by type</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={activities?.activities ?? []}>
              <PolarGrid stroke="var(--color-surface-border)" strokeOpacity={0.5} />
              <PolarAngleAxis dataKey="type" tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }} />
              <Radar name="This Week" dataKey="this_week" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} strokeWidth={1.5} />
              <Radar name="Last Week" dataKey="last_week" stroke="var(--color-surface-muted)" fill="var(--color-surface-muted)" fillOpacity={0.1} strokeWidth={1.5} />
              <Legend wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Bar Comparison */}
      <div className="card p-6">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Activity Breakdown</h3>
          <p className="text-xs text-text-muted mt-0.5">Detailed comparison of all activity types</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={activities?.activities ?? []} barGap={4} barSize={12} margin={{ left: -25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="type" tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }} />
            <Bar dataKey="this_week" name="This Week" fill="#6366F1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="last_week" name="Last Week" fill="var(--color-surface-border)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
