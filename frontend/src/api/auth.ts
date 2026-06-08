import api from './axios';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  refresh: () => api.post('/auth/refresh').then((r) => r.data),

  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password', data).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (data: { token: string; new_password: string }) =>
    api.post('/auth/reset-password', data).then((r) => r.data),
};
