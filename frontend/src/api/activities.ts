import api from './axios';
import type { Activity, ActivityCreate, ActivityUpdate, ActivityFilters, ActivityListResponse } from '../types';

export const activitiesApi = {
  list: (filters: ActivityFilters = {}) =>
    api.get<ActivityListResponse>('/activities/list_all_activities', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<Activity>(`/activities/get_activity_by_id/${id}`).then((r) => r.data),

  create: (data: ActivityCreate) =>
    api.post<Activity>('/activities/create_activity', data).then((r) => r.data),

  update: (id: string, data: ActivityUpdate) =>
    api.patch<Activity>(`/activities/update_activity_by_id/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/activities/delete_activity_by_id/${id}`).then((r) => r.data),
};
