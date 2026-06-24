import api from './axios';
import type { Contact, ContactCreate, ContactUpdate, ContactFilters, ContactListResponse } from '../types';

export const contactsApi = {
  list: (filters: ContactFilters = {}) =>
    api.get<ContactListResponse>('/contacts/get_all_contacts', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<Contact>(`/contacts/get_contact_by_id/${id}`).then((r) => r.data),

  create: (data: ContactCreate) =>
    api.post<Contact>('/contacts/create_contacts', data).then((r) => r.data),

  update: (id: string, data: ContactUpdate) =>
    api.patch<Contact>(`/contacts/update_contact_by_id/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/contacts/delete_contact_by_id/${id}`).then((r) => r.data),

  assign: (id: string, owner_id: string) =>
    api.patch(`/contacts/${id}/assign`, { lead_assgned_to: owner_id }).then((r) => r.data),
};
