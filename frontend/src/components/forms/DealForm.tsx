import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { dealsApi } from '../../api/deals';
import { contactsApi } from '../../api/contacts';
import { useUIStore } from '../../store/uiStore';
import type { Deal, DealCreate } from '../../types';

interface DealFormProps {
  deal?: Deal;
  contactId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;

export const DealForm: React.FC<DealFormProps> = ({ deal, contactId, onSuccess, onCancel }) => {
  const { addToast } = useUIStore();
  const [form, setForm] = useState<DealCreate>({
    contact_id: contactId ?? deal?.contact_id ?? '',
    title: deal?.title ?? '',
    value: deal?.value ?? undefined,
    stage: deal?.stage ?? 'new',
    expected_close: deal?.expected_close ?? '',
    probability: deal?.probability ?? undefined,
    lost_reason: deal?.lost_reason ?? '',
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts', 'all'],
    queryFn: () => contactsApi.list({ limit: 100 }),
    enabled: !contactId,
  });

  const createMutation = useMutation({
    mutationFn: dealsApi.create,
    onSuccess: () => { addToast({ type: 'success', title: 'Deal created!' }); onSuccess(); },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to create deal' }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DealCreate>) => dealsApi.update(deal!.id, data),
    onSuccess: () => { addToast({ type: 'success', title: 'Deal updated!' }); onSuccess(); },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to update deal' }),
  });

  const loading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deal) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Deal Title *</label>
        <input className="input-field" placeholder="e.g. Annual SaaS License" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
      </div>

      {!contactId && (
        <div>
          <label className="label">Contact *</label>
          <select className="input-field" required value={form.contact_id} onChange={e => setForm({...form, contact_id: e.target.value})}>
            <option value="">Select a contact</option>
            {contacts?.contacts.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.company_name ? `— ${c.company_name}` : ''}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Value (₹)</label>
          <input type="number" min={0} className="input-field [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="50000" value={form.value ?? ''} onChange={e => setForm({...form, value: e.target.value === '' ? undefined : parseFloat(e.target.value)})} />
        </div>
        <div>
          <label className="label">Stage</label>
          <select className="input-field" value={form.stage} onChange={e => setForm({...form, stage: e.target.value as any})}>
            {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Expected Close Date</label>
          <input type="date" className="input-field" value={form.expected_close ?? ''} onChange={e => setForm({...form, expected_close: e.target.value})} />
        </div>
        <div>
          <label className="label">Probability (%)</label>
          <input type="number" min={0} max={100} className="input-field [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="10" value={form.probability ?? ''} onChange={e => setForm({...form, probability: e.target.value === '' ? undefined : parseInt(e.target.value)})} />
        </div>
      </div>

      {form.stage === 'lost' && (
        <div>
          <label className="label">Lost Reason</label>
          <textarea className="input-field resize-none" rows={2} placeholder="Why was this deal lost?" value={form.lost_reason ?? ''} onChange={e => setForm({...form, lost_reason: e.target.value})} />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
        <button type="button" onClick={onCancel} className="btn-secondary btn-md">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary btn-md">
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {deal ? 'Save Changes' : 'Create Deal'}
        </button>
      </div>
    </form>
  );
};
