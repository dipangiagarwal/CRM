import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Zap, TrendingUp, Building, Check, Loader2, Receipt } from 'lucide-react';
import { billingApi } from '../../api/billing';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { useUIStore } from '../../store/uiStore';
import { formatDate, formatCurrency, capitalize } from '../../utils/helpers';
import { clsx } from 'clsx';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 299,
    icon: Zap,
    color: 'text-primary-400',
    border: 'border-primary-500/30',
    bg: 'bg-primary-500/5',
    features: ['Up to 5 users', 'Unlimited contacts', 'Pipeline management', 'Basic reports', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 599,
    icon: TrendingUp,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    popular: true,
    features: ['Unlimited users', 'Everything in Starter', 'Advanced analytics', 'File storage', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    icon: Building,
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    features: ['Everything in Growth', 'Custom integrations', 'SLA guarantee', 'Dedicated manager', 'Custom modules'],
  },
];

export const BillingPage: React.FC = () => {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: status, isLoading: sl } = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: billingApi.status,
  });

  const { data: history, isLoading: hl } = useQuery({
    queryKey: ['billing', 'history'],
    queryFn: billingApi.history,
  });

  const createOrderMutation = useMutation({
    mutationFn: billingApi.createOrder,
    onSuccess: (order) => {
      // Load Razorpay script dynamically
      const loadRazorpay = () => {
        return new Promise<void>((resolve) => {
          if (window.Razorpay) { resolve(); return; }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      };

      loadRazorpay().then(() => {
        const rzp = new window.Razorpay({
          key: order.razorpay_key,
          amount: order.amount,
          currency: 'INR',
          name: 'Pixel CRM',
          description: `${capitalize(order.plan)} Plan - Monthly`,
          order_id: order.order_id,
          theme: { color: '#6366F1' },
          handler: async (response: any) => {
            try {
              await billingApi.verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });
              addToast({ type: 'success', title: 'Payment successful!', message: 'Your subscription is now active.' });
              queryClient.invalidateQueries({ queryKey: ['billing'] });
            } catch (err: any) {
              addToast({ type: 'error', title: 'Payment Verification Failed', message: err?.response?.data?.detail ?? 'Please contact support.' });
            } finally {
              setLoadingPlan(null);
            }
          },
          modal: {
            ondismiss: () => setLoadingPlan(null),
          },
        });
        rzp.open();
      });
    },
    onError: (err: any) => {
      setLoadingPlan(null);
      addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to create order' });
    },
  });

  const handleUpgrade = (planId: string) => {
    setLoadingPlan(planId);
    createOrderMutation.mutate(planId);
  };

  if (sl) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Billing & Plans</h1>
        <p className="text-text-muted mt-1 text-sm">Manage your subscription and billing history</p>
      </div>

      {/* Current Plan */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-muted mb-1">Current Plan</p>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-text-primary">{capitalize(status?.plan ?? 'starter')}</h2>
              <span className={clsx('badge', status?.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30')}>
                {capitalize(status?.status ?? '')}
              </span>
            </div>
          </div>
          <CreditCard size={24} className="text-text-muted" />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-surface-border">
          <div>
            <p className="text-xs text-text-muted mb-1">Subscription Ends</p>
            <p className="text-sm font-medium text-text-primary">
              {status?.sub_end ? formatDate(status.sub_end) : 'No active subscription'}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Grace Period Until</p>
            <p className="text-sm font-medium text-text-primary">
              {status?.grace_until ? formatDate(status.grace_until) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Max Users</p>
            <p className="text-sm font-medium text-text-primary">{status?.max_users}</p>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h3 className="font-semibold text-text-primary mb-4">Upgrade Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = status?.plan === plan.id;
            const needsRenewal = isCurrentPlan && status?.status !== 'active';
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={clsx(
                  'card p-6 relative flex flex-col transition-all hover:border-surface-muted',
                  isCurrentPlan && plan.border
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="badge bg-emerald-500 text-white border-0 shadow px-3">Most Popular</span>
                  </div>
                )}

                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-4', plan.bg)}>
                  <Icon size={20} className={plan.color} />
                </div>

                <h4 className="text-lg font-bold text-text-primary">{plan.name}</h4>
                <div className="mt-1 mb-4">
                  <span className="text-3xl font-bold text-text-primary">₹{plan.price}</span>
                  <span className="text-text-muted text-sm">/month</span>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => (!isCurrentPlan || needsRenewal) && handleUpgrade(plan.id)}
                  disabled={(isCurrentPlan && !needsRenewal) || loadingPlan === plan.id}
                  className={clsx(
                    'w-full btn-md',
                    (isCurrentPlan && !needsRenewal) ? 'btn-secondary opacity-75 cursor-not-allowed' : 'btn-primary'
                  )}
                >
                  {loadingPlan === plan.id ? <Loader2 size={14} className="animate-spin" /> : null}
                  {(isCurrentPlan && !needsRenewal) ? 'Current Plan' : (needsRenewal && isCurrentPlan ? 'Renew Plan' : 'Upgrade')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border flex items-center gap-2">
          <Receipt size={16} className="text-text-muted" />
          <h3 className="font-semibold text-text-primary">Payment History</h3>
        </div>
        {hl ? (
          <div className="p-8 text-center"><PageLoader /></div>
        ) : history?.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">No payments yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg-elevated text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                {['Date', 'Plan', 'Amount', 'Period', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {history?.map(record => (
                <tr key={record.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(record.created_at ?? undefined)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary capitalize">{record.plan}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-400">{formatCurrency(record.amount)}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {record.period_start && record.period_end
                      ? `${formatDate(record.period_start)} — ${formatDate(record.period_end)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', {
                      'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30': record.status === 'paid',
                      'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30': record.status === 'pending',
                      'text-red-400 bg-red-500/10 border border-red-500/30': record.status === 'failed',
                    })}>
                      {capitalize(record.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
