import api from './axios';
import type { Organization } from '../types';

export const organizationsApi = {
  me: () =>
    api.get<Organization>('/organizations/me').then((r) => r.data),

  update: (name: string) =>
    api.patch('/organizations/me', { name }).then((r) => r.data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/organizations/me/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  completeOnboarding: (data: { company_name?: string; industry?: string; company_size?: string }) =>
    api.post('/organizations/onboarding', data).then((r) => r.data),

  onboardingStatus: () =>
    api.get('/organizations/onboarding/status').then((r) => r.data),
};
