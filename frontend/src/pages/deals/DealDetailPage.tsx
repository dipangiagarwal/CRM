import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, IndianRupee, Calendar, Trash2, Paperclip, Download } from 'lucide-react';
import { dealsApi } from '../../api/deals';
import { activitiesApi } from '../../api/activities';
import { filesApi } from '../../api/files';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { DealForm } from '../../components/forms/DealForm';
import { ActivityForm } from '../../components/forms/ActivityForm';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import {
  formatCurrency, formatDate, timeAgo, STAGE_COLORS, STAGE_LABELS,
  ACTIVITY_ICONS, ACTIVITY_COLORS, formatFileSize
} from '../../utils/helpers';
import { clsx } from 'clsx';

export const DealDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealsApi.get(id!),
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ['activities', 'deal', id],
    queryFn: () => activitiesApi.list({ deal_id: id, limit: 50 }),
    enabled: !!id,
  });

  const { data: files } = useQuery({
    queryKey: ['files', 'deal', id],
    queryFn: () => filesApi.list({ deal_id: id }),
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => filesApi.upload(file, { deal_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'deal', id] });
      addToast({ type: 'success', title: 'File uploaded' });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: filesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'deal', id] });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!deal) return <div className="text-text-muted p-8">Deal not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <button onClick={() => navigate('/deals')} className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-4">
          <ArrowLeft size={14} /> Back to Pipeline
        </button>

        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={clsx('badge', STAGE_COLORS[deal.stage])}>{STAGE_LABELS[deal.stage]}</span>
                <span className="text-sm text-text-muted">{deal.probability}% probability</span>
              </div>
              <h1 className="text-2xl font-bold text-text-primary">{deal.title}</h1>
              {deal.value && (
                <div className="flex items-center gap-1.5 mt-2">
                  <IndianRupee size={18} className="text-emerald-400" />
                  <span className="text-2xl font-bold text-emerald-400">{formatCurrency(deal.value)}</span>
                </div>
              )}
            </div>
            {user?.role !== 'viewer' && (
              <div className="flex items-center gap-2">
                <button onClick={() => setActivityOpen(true)} className="btn-secondary btn-sm">
                  <Plus size={13} /> Log Activity
                </button>
                <button onClick={() => setEditOpen(true)} className="btn-primary btn-sm">
                  <Edit2 size={13} /> Edit
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-border">
            <div>
              <p className="text-xs text-text-muted mb-1">Expected Close</p>
              <p className="text-sm text-text-primary flex items-center gap-1.5">
                <Calendar size={12} className="text-text-muted" />
                {formatDate(deal.expected_close ?? undefined)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Probability</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 bg-bg-hover rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${deal.probability}%` }} />
                </div>
                <span className="text-sm text-text-primary">{deal.probability}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Created</p>
              <p className="text-sm text-text-primary">{formatDate(deal.created_at ?? undefined)}</p>
            </div>
            {deal.lost_reason && (
              <div>
                <p className="text-xs text-text-muted mb-1">Lost Reason</p>
                <p className="text-sm text-text-primary">{deal.lost_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Activity Timeline</h2>
            {user?.role !== 'viewer' && (
              <button onClick={() => setActivityOpen(true)} className="btn-secondary btn-sm"><Plus size={13} /> Add</button>
            )}
          </div>
          <div className="space-y-3">
            {activities?.activities.length === 0 && (
              <div className="card p-8 text-center text-sm text-text-muted">No activities logged yet</div>
            )}
            {activities?.activities.map((act) => (
              <div key={act.id} className="card p-4 flex items-start gap-3">
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0', ACTIVITY_COLORS[act.type])}>
                  {ACTIVITY_ICONS[act.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">{act.title}</p>
                    <span className="text-xs text-text-muted">{timeAgo(act.created_at ?? undefined)}</span>
                  </div>
                  {act.body && <p className="text-sm text-text-muted mt-1">{act.body}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Files</h2>
            {user?.role !== 'viewer' && (
              <label className="btn-secondary btn-sm cursor-pointer">
                <Paperclip size={13} /> Upload
                <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); }} />
              </label>
            )}
          </div>
          <div className="space-y-2">
            {files?.length === 0 && <div className="card p-6 text-center text-xs text-text-muted">No files attached</div>}
            {files?.map(file => (
              <div key={file.id} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Paperclip size={14} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{file.filename}</p>
                  <p className="text-xs text-text-muted">{formatFileSize(file.size_bytes)}</p>
                </div>
                <div className="flex gap-1">
                  <a href={filesApi.downloadUrl(file.id)} target="_blank" className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary">
                    <Download size={13} />
                  </a>
                  {user?.role !== 'viewer' && (
                    <button onClick={() => deleteFileMutation.mutate(file.id)} className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Deal" size="lg">
        <DealForm deal={deal} onSuccess={() => { setEditOpen(false); queryClient.invalidateQueries({ queryKey: ['deal', id] }); }} onCancel={() => setEditOpen(false)} />
      </Modal>

      <Modal isOpen={activityOpen} onClose={() => setActivityOpen(false)} title="Log Activity" size="md">
        <ActivityForm contactId={deal.contact_id} dealId={deal.id} onSuccess={() => { setActivityOpen(false); queryClient.invalidateQueries({ queryKey: ['activities', 'deal', id] }); }} onCancel={() => setActivityOpen(false)} />
      </Modal>
    </div>
  );
};
