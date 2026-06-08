import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { contactsApi } from '../../api/contacts';
import { useUIStore } from '../../store/uiStore';
import type { Contact, ContactCreate } from '../../types';

interface ContactFormProps {
  contact?: Contact;
  onSuccess: () => void;
  onCancel: () => void;
}

const LIFECYCLE_STAGES = ['lead', 'prospect', 'customer', 'churned'];
const SOURCES = ['website', 'referral', 'cold_call', 'email', 'social_media', 'event', 'other'];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="label">{label}</label>
    {children}
  </div>
);

export const ContactForm: React.FC<ContactFormProps> = ({ contact, onSuccess, onCancel }) => {
  const { addToast } = useUIStore();
  const [form, setForm] = useState<ContactCreate>({
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    company_name: contact?.company_name ?? '',
    lifecycle_stage: contact?.lifecycle_stage ?? 'lead',
    lead_score: contact?.lead_score ?? 0,
    source: contact?.source ?? '',
    tags: contact?.tags ?? [],
  });
  const [tagsInput, setTagsInput] = useState(contact?.tags?.join(', ') ?? '');

  const createMutation = useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => { addToast({ type: 'success', title: 'Contact created!' }); onSuccess(); },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to create contact' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ContactCreate) => contactsApi.update(contact!.id, data),
    onSuccess: () => { addToast({ type: 'success', title: 'Contact updated!' }); onSuccess(); },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to update contact' }),
  });

  const loading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const data = { ...form, tags };
    if (contact) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name *">
          <input className="input-field" placeholder="Jane" required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
        </Field>
        <Field label="Last Name">
          <input className="input-field" placeholder="Doe" value={form.last_name ?? ''} onChange={e => setForm({...form, last_name: e.target.value})} />
        </Field>
      </div>

      <Field label="Email">
        <input type="email" className="input-field" placeholder="jane@company.com" value={form.email ?? ''} onChange={e => setForm({...form, email: e.target.value})} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone">
          <input className="input-field" placeholder="+91 9876543210" value={form.phone ?? ''} onChange={e => setForm({...form, phone: e.target.value})} />
        </Field>
        <Field label="Company">
          <input className="input-field" placeholder="Acme Corp" value={form.company_name ?? ''} onChange={e => setForm({...form, company_name: e.target.value})} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Lifecycle Stage">
          <select className="input-field" value={form.lifecycle_stage} onChange={e => setForm({...form, lifecycle_stage: e.target.value as any})}>
            {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select className="input-field" value={form.source ?? ''} onChange={e => setForm({...form, source: e.target.value})}>
            <option value="">Select source</option>
            {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </Field>
      </div>

      <Field label={`Lead Score: ${form.lead_score}`}>
        <input type="range" min={0} max={100} className="w-full h-2 rounded-full accent-primary-500" value={form.lead_score ?? 0} onChange={e => setForm({...form, lead_score: parseInt(e.target.value)})} />
        <div className="flex justify-between text-xs text-text-muted mt-1"><span>Cold (0)</span><span>Hot (100)</span></div>
      </Field>

      <Field label="Tags (comma-separated)">
        <input className="input-field" placeholder="hot-lead, enterprise, saas" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
      </Field>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
        <button type="button" onClick={onCancel} className="btn-secondary btn-md">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary btn-md">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {contact ? 'Save Changes' : 'Create Contact'}
        </button>
      </div>
    </form>
  );
};
