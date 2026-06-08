import axios from 'axios';

export const platformApiInstance = axios.create({
  baseURL: '/api/v1/platform',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to inject X-Platform-Key
platformApiInstance.interceptors.request.use((config) => {
  const key = localStorage.getItem('platform_admin_key');
  if (key) {
    config.headers['X-Platform-Key'] = key;
  }
  return config;
});

// Intercept 403 and redirect to platform login
platformApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      localStorage.removeItem('platform_admin_key');
      if (window.location.pathname !== '/platform-admin/login') {
        window.location.href = '/platform-admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export const platformApi = {
  stats: () => platformApiInstance.get('/stats').then(r => r.data),
  
  organizations: () => platformApiInstance.get('/organizations').then(r => r.data),
  
  getOrganization: (id: string) => platformApiInstance.get(`/organizations/${id}`).then(r => r.data),
  
  suspendOrganization: (id: string) => platformApiInstance.patch(`/organizations/${id}/suspend`).then(r => r.data),
  
  activateOrganization: (id: string) => platformApiInstance.patch(`/organizations/${id}/activate`).then(r => r.data),
  
  billingHistory: (id: string) => platformApiInstance.get(`/organizations/${id}/billing`).then(r => r.data),
};
