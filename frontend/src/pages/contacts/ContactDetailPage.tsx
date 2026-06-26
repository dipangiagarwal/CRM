import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, Building2, Tag, Edit2, Plus, Paperclip,
  Trash2, Download, Calendar, UserCheck
} from 'lucide-react';
import { contactsApi } from '../../api/contacts';
import { activitiesApi } from '../../api/activities';
import { filesApi } from '../../api/files';
import { Avatar } from '../../components/ui/Avatar';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { ContactForm } from '../../components/forms/ContactForm';
import { ActivityForm } from '../../components/forms/ActivityForm';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import {
  formatDate, timeAgo, LIFECYCLE_COLORS, ACTIVITY_ICONS, ACTIVITY_COLORS,
  capitalize, formatFileSize, getLeadScoreColor
} from '../../utils/helpers';
import { clsx } from 'clsx';

export const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.get(id!),
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ['activities', 'contact', id],
    queryFn: () => activitiesApi.list({ contact_id: id, limit: 50 }),
    enabled: !!id,
  });

  const { data: files } = useQuery({
    queryKey: ['files', 'contact', id],
    queryFn: () => filesApi.list({ contact_id: id }),
    enabled: !!id,
  });

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => filesApi.upload(file, { contact_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'contact', id] });
      addToast({ type: 'success', title: 'File uploaded' });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: filesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', 'contact', id] });
      addToast({ type: 'success', title: 'File deleted' });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!contact) return <div className="text-text-muted p-8 text-center text-sm font-semibold">Contact profile not found</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Back Link */}
      <div>
        <button
          onClick={() => navigate('/contacts')}
          className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary uppercase tracking-wider transition-colors mb-4"
        >
          <ArrowLeft size={13} /> Back to Contacts
        </button>

        <div className="card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar firstName={contact.first_name} lastName={contact.last_name} size="lg" className="shadow-sm border border-surface-border/50" />
              <div>
                <h1 className="text-lg font-bold text-text-primary tracking-tight">
                  {contact.first_name} {contact.last_name}
                </h1>
                {contact.company_name && (
                  <p className="text-text-muted text-xs flex items-center gap-1.5 mt-1 font-medium">
                    <Building2 size={12} /> {contact.company_name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2.5">
                  <span className={clsx('badge text-[10px] py-0.5 px-2 font-bold', LIFECYCLE_COLORS[contact.lifecycle_stage])}>
                    {capitalize(contact.lifecycle_stage)}
                  </span>
                  <span className={clsx('text-xs font-bold', getLeadScoreColor(contact.lead_score))}>
                    Score: {contact.lead_score}
                  </span>
                </div>
              </div>
            </div>
            {user?.role !== 'viewer' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/contacts/${contact.id}/assign`)}
                  className="btn-secondary btn-sm"
                >
                  <UserCheck size={13} /> Assign Lead
                </button>
                <button onClick={() => setActivityOpen(true)} className="btn-secondary btn-sm">
                  <Plus size={13} /> Log Activity
                </button>
                <button onClick={() => setEditOpen(true)} className="btn-primary btn-sm">
                  <Edit2 size={13} /> Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-border/55">
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Email</p>
              <p className="text-xs text-text-primary flex items-center gap-1.5 font-medium truncate">
                <Mail size={12} className="text-text-muted shrink-0" />
                {contact.email || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Phone</p>
              <p className="text-xs text-text-primary flex items-center gap-1.5 font-medium">
                <Phone size={12} className="text-text-muted shrink-0" />
                {contact.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Lead Source</p>
              <p className="text-xs text-text-primary font-medium">{contact.source || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Created Date</p>
              <p className="text-xs text-text-primary flex items-center gap-1.5 font-medium">
                <Calendar size={12} className="text-text-muted" />
                {formatDate(contact.created_at ?? undefined)}
              </p>
            </div>
          </div>

          {/* Tags list */}
          {contact.tags?.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-border/30 flex-wrap">
              <Tag size={12} className="text-text-muted" />
              {contact.tags.map((tag) => (
                <span key={tag} className="badge text-[9px] py-0 px-2.5 text-text-secondary bg-bg bg-opacity-40 border-surface-border">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Activity History</h2>
            {user?.role !== 'viewer' && (
              <button onClick={() => setActivityOpen(true)} className="btn-secondary btn-sm">
                <Plus size={12} /> Log Activity
              </button>
            )}
          </div>

          <div className="space-y-3">
            {activities?.activities.length === 0 && (
              <div className="card p-8 text-center text-xs font-medium text-text-muted">
                No activity history found. Add the first log above!
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
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFileMutation.mutate(file);
                  }}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            {files?.length === 0 && (
              <div className="card p-6 text-center text-xs font-medium text-text-muted">
                No files uploaded to this profile.
              </div>
            )}
            {files?.map((file) => (
              <div key={file.id} className="card p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip size={13} className="text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate max-w-[150px]">{file.filename}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 font-medium">{formatFileSize(file.size_bytes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={filesApi.downloadUrl(file.id)}
                    target="_blank"
                    className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary"
                  >
                    <Download size={12} />
                  </a>
                  {user?.role !== 'viewer' && (
                    <button
                      onClick={() => deleteFileMutation.mutate(file.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Contact Info" size="lg">
        <ContactForm
          contact={contact}
          onSuccess={() => {
            setEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ['contact', id] });
          }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Activity Modal */}
      <Modal isOpen={activityOpen} onClose={() => setActivityOpen(false)} title="Log New Activity" size="md">
        <ActivityForm
          contactId={contact.id}
          onSuccess={() => {
            setActivityOpen(false);
            queryClient.invalidateQueries({ queryKey: ['activities', 'contact', id] });
          }}
          onCancel={() => setActivityOpen(false)}
        />
      </Modal>
    </div>
  );
};
