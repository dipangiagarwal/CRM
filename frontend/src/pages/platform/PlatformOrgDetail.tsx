import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/platform';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { useUIStore } from '../../store/uiStore';
import { formatDate, formatCurrency, capitalize } from '../../utils/helpers';
import { ArrowLeft, AlertCircle, CheckCircle2, Building, Users, Receipt } from 'lucide-react';
import { clsx } from 'clsx';

export const PlatformOrgDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['platform', 'organization', id],
    queryFn: () => platformApi.getOrganization(id!),
    enabled: !!id,
  });

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ['platform', 'billing', id],
    queryFn: () => platformApi.billingHistory(id!),
    enabled: !!id,
  });

  const suspendMutation = useMutation({
    mutationFn: () => platformApi.suspendOrganization(id!),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Organization suspended' });
      queryClient.invalidateQueries({ queryKey: ['platform', 'organization', id] });
    },
    onSettled: () => setIsUpdating(false),
  });

  const activateMutation = useMutation({
    mutationFn: () => platformApi.activateOrganization(id!),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Organization activated' });
      queryClient.invalidateQueries({ queryKey: ['platform', 'organization', id] });
    },
    onSettled: () => setIsUpdating(false),
  });

  const handleStatusChange = (newStatus: 'active' | 'suspended') => {
    setIsUpdating(true);
    if (newStatus === 'suspended') {
      suspendMutation.mutate();
    } else {
      activateMutation.mutate();
    }
  };

  if (orgLoading) return <PageLoader />;
  if (!org) return <div className="text-text-muted p-8 text-center">Organization not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/platform-admin/organizations')}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to Organizations
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary">{org.name}</h1>
              <span className={clsx('badge', {
                'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30': org.status === 'active',
                'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30': org.status === 'grace',
                'text-red-400 bg-red-500/10 border border-red-500/30': org.status === 'suspended',
              })}>
                {capitalize(org.status)}
              </span>
            </div>
            <p className="text-text-muted text-sm font-mono">{org.slug} • ID: {org.id}</p>
          </div>
          <div>
            {org.status !== 'suspended' ? (
              <button
                onClick={() => handleStatusChange('suspended')}
                disabled={isUpdating}
                className="btn-primary bg-red-500 hover:bg-red-600 focus:ring-red-500"
              >
                <AlertCircle size={14} /> Suspend Access
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={isUpdating}
                className="btn-primary bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500"
              >
                <CheckCircle2 size={14} /> Activate Access
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Details & Users */}
        <div className="xl:col-span-2 space-y-6">
          {/* Org Details */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4 text-text-primary font-semibold">
              <Building size={16} className="text-text-muted" />
              Subscription Details
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Plan</p>
                <p className="text-sm font-medium text-text-primary capitalize">{org.plan}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Subscription Ends</p>
                <p className="text-sm font-medium text-text-primary">{org.sub_end ? formatDate(org.sub_end) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Grace Period Until</p>
                <p className="text-sm font-medium text-text-primary">{org.grace_until ? formatDate(org.grace_until) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Joined</p>
                <p className="text-sm font-medium text-text-primary">{formatDate(org.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-primary font-semibold">
                <Users size={16} className="text-text-muted" />
                Users ({org.users.length} / {org.max_users})
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-elevated text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {org.users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-text-primary">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-text-muted">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary capitalize">{u.role}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider', u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {u.last_login_at ? formatDate(u.last_login_at) : 'Never'}
                    </td>
                  </tr>
                ))}
                {org.users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Billing History */}
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-border flex items-center gap-2 text-text-primary font-semibold">
              <Receipt size={16} className="text-text-muted" />
              Billing History
            </div>
            {billingLoading ? (
              <div className="p-8 text-center"><PageLoader /></div>
            ) : billing?.billing.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-muted">No billing history</div>
            ) : (
              <div className="divide-y divide-surface-border max-h-[600px] overflow-y-auto">
                {billing?.billing.map((record: any) => (
                  <div key={record.id} className="p-4 hover:bg-bg-hover transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-bold text-text-primary capitalize">{record.plan} Plan</span>
                        <p className="text-xs text-text-muted mt-0.5">{formatDate(record.created_at)}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">{formatCurrency(record.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={clsx('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded', {
                        'bg-emerald-500/10 text-emerald-400': record.status === 'paid',
                        'bg-yellow-500/10 text-yellow-400': record.status === 'pending',
                        'bg-red-500/10 text-red-400': record.status === 'failed',
                      })}>
                        {record.status}
                      </span>
                      <p className="text-[10px] text-text-muted font-mono">{record.razorpay_payment_id || 'No Txn ID'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
