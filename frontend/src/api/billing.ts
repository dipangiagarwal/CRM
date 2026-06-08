import api from './axios';
import type { BillingRecord, BillingStatus } from '../types';

export const billingApi = {
  history: () =>
    api.get<BillingRecord[]>('/billing/history').then((r) => r.data),

  status: () =>
    api.get<BillingStatus>('/billing/status').then((r) => r.data),

  createOrder: (plan: string) =>
    api.post('/billing/create-order', { plan }).then((r) => r.data),

  verifyPayment: (data: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) =>
    api.post('/billing/verify-payment', data).then((r) => r.data),
};
