import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { activitiesApi } from '../../api/activities';
import { Modal } from '../../components/ui/Modal';
import { ActivityForm } from '../../components/forms/ActivityForm';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { contactsApi } from '../../api/contacts';
import { timeAgo, ACTIVITY_ICONS, ACTIVITY_COLORS, capitalize } from '../../utils/helpers';
import { clsx } from 'clsx';
import type { ActivityType } from '../../types';

const ACTIVITY_TYPES: ActivityType[] = ['call', 'email', 'note', 'meeting', 'task', 'message'];

export const ActivitiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const [selectedType, setSelectedType] = useState<ActivityType | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['activities', 'all', selectedType],
    queryFn: () => activitiesApi.list({ type: selectedType || undefined, limit: 50 }),
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts', 'select'],
    queryFn: () => contactsApi.list({ limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: activitiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      addToast({ type: 'success', title: 'Activity deleted' });
    },
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activities</h1>
          <p className="text-text-muted mt-1 text-sm">{data?.total ?? 0} activities logged</p>
        </div>
        {user?.role !== 'viewer' && (
          <button onClick={() => setCreateOpen(true)} className="btn-primary btn-sm">
            <Plus size={14} /> Log Activity
          </button>
        )}
      </div>

      {/* Type Filter */}
      <div className="card p-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedType('')}
          className={clsx('badge cursor-pointer', selectedType === '' ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30' : 'text-text-muted bg-bg-hover border border-surface-border')}
        >
          All
        </button>
        {ACTIVITY_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(selectedType === type ? '' : type)}
            className={clsx('badge cursor-pointer gap-1.5', selectedType === type ? ACTIVITY_COLORS[type] + ' border border-current/20' : 'text-text-muted bg-bg-hover border border-surface-border')}
          >
            {ACTIVITY_ICONS[type]} {capitalize(type)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <PageLoader />
      ) : data?.activities.length === 0 ? (
        <EmptyState
          title="No activities found"
          description="Start logging calls, emails, meetings, and notes to track your customer interactions."
          action={user?.role !== 'viewer' ? <button onClick={() => setCreateOpen(true)} className="btn-primary btn-md"><Plus size={14} /> Log Activity</button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {data?.activities.map((act) => (
            <div key={act.id} className="card p-4 flex items-start gap-4 hover:border-surface-muted transition-colors">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0', ACTIVITY_COLORS[act.type])}>
                {ACTIVITY_ICONS[act.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{act.title}</p>
                    {act.body && <p className="text-sm text-text-muted mt-1 leading-relaxed">{act.body}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-xs text-text-muted">{timeAgo(act.created_at ?? undefined)}</span>
                    {user?.role !== 'viewer' && (
                      <button
                        onClick={() => deleteMutation.mutate(act.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className={clsx('badge text-xs', ACTIVITY_COLORS[act.type])}>{capitalize(act.type)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Log New Activity" size="md">
        <div className="mb-4">
          <label className="label">Contact</label>
          <select className="input-field" value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)}>
            <option value="">Select a contact</option>
            {contacts?.contacts.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        {selectedContactId ? (
          <ActivityForm
            contactId={selectedContactId}
            onSuccess={() => {
              setCreateOpen(false);
              setSelectedContactId('');
              queryClient.invalidateQueries({ queryKey: ['activities'] });
            }}
            onCancel={() => { setCreateOpen(false); setSelectedContactId(''); }}
          />
        ) : (
          <p className="text-sm text-text-muted text-center py-4">Please select a contact above to continue.</p>
        )}
      </Modal>
    </div>
  );
};
