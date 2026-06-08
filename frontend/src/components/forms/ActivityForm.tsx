import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { activitiesApi } from '../../api/activities';
import { useUIStore } from '../../store/uiStore';
import type { ActivityType } from '../../types';

interface ActivityFormProps {
  contactId: string;
  dealId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const TYPES: { type: ActivityType; label: string; icon: string }[] = [
  { type: 'call', label: 'Call', icon: '📞' },
  { type: 'email', label: 'Email', icon: '✉️' },
  { type: 'note', label: 'Note', icon: '📝' },
  { type: 'meeting', label: 'Meeting', icon: '🤝' },
  { type: 'task', label: 'Task', icon: '✅' },
  { type: 'message', label: 'Message', icon: '💬' },
];

export const ActivityForm: React.FC<ActivityFormProps> = ({ contactId, dealId, onSuccess, onCancel }) => {
  const { addToast } = useUIStore();
  const [type, setType] = useState<ActivityType>('note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const createMutation = useMutation({
    mutationFn: activitiesApi.create,
    onSuccess: () => { addToast({ type: 'success', title: 'Activity logged!' }); onSuccess(); },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to log activity' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ contact_id: contactId, deal_id: dealId, type, title, body });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Activity Type */}
      <div>
        <label className="label">Activity Type</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setType(t.type)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all
                ${type === t.type
                  ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                  : 'border-surface-border hover:border-surface-muted text-text-secondary'}`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Title *</label>
        <input className="input-field" placeholder={`e.g. ${type === 'call' ? 'Call with CEO' : type === 'email' ? 'Follow-up email sent' : 'Meeting notes'}`} required value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea className="input-field resize-none" rows={3} placeholder="Add details, outcome, next steps..." value={body} onChange={e => setBody(e.target.value)} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
        <button type="button" onClick={onCancel} className="btn-secondary btn-md">Cancel</button>
        <button type="submit" disabled={createMutation.isPending} className="btn-primary btn-md">
          {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Log Activity
        </button>
      </div>
    </form>
  );
};
