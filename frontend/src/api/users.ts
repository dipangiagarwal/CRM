import api from './axios';
import type { User, UserInvite, UserUpdate } from '../types';

export const usersApi = {
  listAll: () =>
    api.get<User[]>('/users/list_all_users').then((r) => r.data),

  me: () =>
    api.get<User>('/users/me').then((r) => r.data),

  updateMe: (data: UserUpdate) =>
    api.patch<User>('/users/update_me', data).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<User>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  invite: (data: UserInvite) =>
    api.post<User>('/users/invite_user', data).then((r) => r.data),

  bulkInvite: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/bulk-invite', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  updateRole: (userId: string, role: string) =>
    api.patch<User>(`/users/${userId}/update_role_by_id`, { role }).then((r) => r.data),

  deactivate: (userId: string) =>
    api.patch<User>(`/users/${userId}/edit_user/deactivate_user`).then((r) => r.data),

  activate: (userId: string) =>
    api.patch<User>(`/users/${userId}/edit_user/activate_user`).then((r) => r.data),

  transferData: (userId: string, toUserId: string) =>
    api.post(`/users/${userId}/transfer_data_by_user_id`, { to_user_id: toUserId }).then((r) => r.data),
};
