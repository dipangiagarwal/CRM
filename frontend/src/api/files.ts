import api from './axios';
import type { FileRecord } from '../types';

export const filesApi = {
  list: (params: { contact_id?: string; deal_id?: string } = {}) =>
    api.get<FileRecord[]>('/files/get_files', { params }).then((r) => r.data),

  upload: (file: File, params: { contact_id?: string; deal_id?: string } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<FileRecord>('/files/upload_file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    }).then((r) => r.data);
  },

  downloadUrl: (fileId: string) => `/api/v1/files/get_file/${fileId}/download`,

  delete: (fileId: string) =>
    api.delete(`/files/delete_file/${fileId}`).then((r) => r.data),
};
