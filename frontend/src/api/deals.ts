import api from './axios';
import type { Deal, DealCreate, DealUpdate, DealStageUpdate, DealFilters, DealListResponse } from '../types';

export const dealsApi = {
  list: (filters: DealFilters = {}) =>
    api.get<DealListResponse>('/deals/list_all_deals', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<Deal>(`/deals/get_deal_by_id/${id}`).then((r) => r.data),

  create: (data: DealCreate) =>
    api.post<Deal>('/deals/create_deal', data).then((r) => r.data),

  update: (id: string, data: DealUpdate) =>
    api.patch<Deal>(`/deals/update_deal_by_id/${id}`, data).then((r) => r.data),

  updateStage: (id: string, data: DealStageUpdate) =>
    api.patch<Deal>(`/deals/update_deal_stage/${id}/stage`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/deals/delete_deal_by_id/${id}`).then((r) => r.data),
};
