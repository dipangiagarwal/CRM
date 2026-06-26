import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Calendar, Trash2, Paperclip, Download } from 'lucide-react';
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
      addToast({ type: 'success', title: 'File deleted' });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!deal) return <div className="text-text-muted p-8 text-center text-sm font-semibold">Deal profile not found</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Back link */}
      <div>
        <button
          onClick={() => navigate('/deals')}
          className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary uppercase tracking-wider transition-colors mb-4"
        >
          <ArrowLeft size={13} /> Back to Pipeline
        </button>

        <div className="card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className={clsx('badge text-[10px] py-0.5 px-2 font-bold', STAGE_COLORS[deal.stage])}>
                  {STAGE_LABELS[deal.stage]}
                </span>
                <span className="text-xs text-text-muted font-medium">{deal.probability}% closing rate</span>
              </div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">{deal.title}</h1>
              {deal.value !== undefined && (
                <div className="flex items-center gap-1 mt-2.5">
                  <span className="text-2xl font-extrabold text-emerald-400">{formatCurrency(deal.value)}</span>
                </div>
              )}
            </div>
            {user?.role !== 'viewer' && (
              <div className="flex items-center gap-2">
                <button onClick={() => setActivityOpen(true)} className="btn-secondary btn-sm">
                  <Plus size={13} /> Log Activity
                </button>
                <button onClick={() => setEditOpen(true)} className="btn-primary btn-sm">
                  <Edit2 size={13} /> Edit Deal
                </button>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-border/50">
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Expected Close</p>
              <p className="text-xs text-text-primary flex items-center gap-1.5 font-medium">
                <Calendar size={12} className="text-text-muted" />
                {formatDate(deal.expected_close ?? undefined)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Deal Probability</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1 w-20 bg-bg-hover rounded-full overflow-hidden border border-surface-border/25">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${deal.probability}%` }} />
                </div>
                <span className="text-xs text-text-primary font-semibold">{deal.probability}%</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Created Date</p>
              <p className="text-xs text-text-primary font-medium">{formatDate(deal.created_at ?? undefined)}</p>
            </div>
            {deal.lost_reason && (
              <div>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Reason for Lost</p>
                <p className="text-xs text-text-primary font-medium">{deal.lost_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Activity Timeline</h2>
            {user?.role !== 'viewer' && (
              <button onClick={() => setActivityOpen(true)} className="btn-secondary btn-sm">
                <Plus size={12} /> Add Activity
              </button>
            )}
          </div>

          <div className="space-y-3">
            {activities?.activities.length === 0 && (
              <div className="card p-8 text-center text-xs font-medium text-text-muted">
                No activities logged on this deal yet.
              </div>
            )}
            {activities?.activities.map((act) => (
              <div key={act.id} className="card p-4 flex items-start gap-3">
                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0', ACTIVITY_COLORS[act.type])}>
                  {ACTIVITY_ICONS[act.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-text-primary leading-tight">{act.title}</p>
                    <span className="text-[10px] text-text-muted font-medium">{timeAgo(act.created_at ?? undefined)}</span>
                  </div>
                  {act.body && <p className="text-xs text-text-secondary mt-1.5 leading-snug">{act.body}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Files section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Attached Files</h2>
            {user?.role !== 'viewer' && (
              <label className="btn-secondary btn-sm cursor-pointer select-none">
                <Paperclip size={12} /> Upload
                <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); }} />
              </label>
            )}
          </div>
          <div className="space-y-2">
            {files?.length === 0 && (
              <div className="card p-6 text-center text-xs font-medium text-text-muted">
                No files uploaded to this deal.
              </div>
            )}
            {files?.map(file => (
              <div key={file.id} className="card p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip size={13} className="text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate max-w-[150px]">{file.filename}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 font-medium">{formatFileSize(file.size_bytes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a href={filesApi.downloadUrl(file.id)} target="_blank" className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary">
                    <Download size={12} />
                  </a>
                  {user?.role !== 'viewer' && (
                    <button onClick={() => deleteFileMutation.mutate(file.id)} className="p-1 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Deal Info" size="lg">
        <DealForm deal={deal} onSuccess={() => { setEditOpen(false); queryClient.invalidateQueries({ queryKey: ['deal', id] }); }} onCancel={() => setEditOpen(false)} />
      </Modal>

      <Modal isOpen={activityOpen} onClose={() => setActivityOpen(false)} title="Log New Activity" size="md">
        <ActivityForm contactId={deal.contact_id} dealId={deal.id} onSuccess={() => { setActivityOpen(false); queryClient.invalidateQueries({ queryKey: ['activities', 'deal', id] }); }} onCancel={() => setActivityOpen(false)} />
      </Modal>
    </div>
  );
};
