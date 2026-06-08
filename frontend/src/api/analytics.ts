import api from './axios';
import type { OverviewStats, PipelineStage, ActivitySummary, RevenueMonth } from '../types';

export const analyticsApi = {
  overview: () =>
    api.get<OverviewStats>('/analytics/overview').then((r) => r.data),

  pipeline: () =>
    api.get<{ pipeline: PipelineStage[] }>('/analytics/pipeline').then((r) => r.data),

  activities: () =>
    api.get<{ activities: ActivitySummary[] }>('/analytics/activities').then((r) => r.data),

  revenue: () =>
    api.get<{ revenue_trend: RevenueMonth[] }>('/analytics/revenue').then((r) => r.data),
};
