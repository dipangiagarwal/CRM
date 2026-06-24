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
  if (!contact) return <div className="text-text-muted p-8">Contact not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/contacts')}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to Contacts
        </button>

        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar firstName={contact.first_name} lastName={contact.last_name} size="lg" />
              <div>
                <h1 className="text-xl font-bold text-text-primary">
                  {contact.first_name} {contact.last_name}
                </h1>
                {contact.company_name && (
                  <p className="text-text-muted text-sm flex items-center gap-1.5 mt-1">
                    <Building2 size={13} /> {contact.company_name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={clsx('badge', LIFECYCLE_COLORS[contact.lifecycle_stage])}>
                    {capitalize(contact.lifecycle_stage)}
                  </span>
                  <span className={clsx('text-sm font-bold', getLeadScoreColor(contact.lead_score))}>
                    Score: {contact.lead_score}
                  </span>
                </div>
              </div>
            </div>
            {user?.role !== 'viewer' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/contacts/${contact.id}/assign`)}
                  className="btn-secondary btn-sm hover:text-primary-400 hover:border-primary-500/30 transition-colors"
                >
                  <UserCheck size={13} /> Assign Lead
                </button>
                <button onClick={() => setActivityOpen(true)} className="btn-secondary btn-sm">
                  <Plus size={13} /> Log Activity
                </button>
                <button onClick={() => setEditOpen(true)} className="btn-primary btn-sm">
                  <Edit2 size={13} /> Edit
                </button>
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-border">
            <div>
              <p className="text-xs text-text-muted mb-1">Email</p>
              <p className="text-sm text-text-primary flex items-center gap-1.5">
                <Mail size={12} className="text-text-muted" />
                {contact.email || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Phone</p>
              <p className="text-sm text-text-primary flex items-center gap-1.5">
                <Phone size={12} className="text-text-muted" />
                {contact.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Source</p>
              <p className="text-sm text-text-primary">{contact.source || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Created</p>
              <p className="text-sm text-text-primary flex items-center gap-1.5">
                <Calendar size={12} className="text-text-muted" />
                {formatDate(contact.created_at ?? undefined)}
              </p>
            </div>
          </div>

          {/* Tags */}
          {contact.tags?.length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Tag size={13} className="text-text-muted" />
              {contact.tags.map((tag) => (
                <span key={tag} className="badge text-text-muted bg-bg-hover border border-surface-border">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Timeline */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Activity Timeline</h2>
            {user?.role !== 'viewer' && (
              <button onClick={() => setActivityOpen(true)} className="btn-secondary btn-sm">
                <Plus size={13} /> Add
              </button>
            )}
          </div>

          <div className="space-y-3">
            {activities?.activities.length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-text-muted text-sm">No activities yet. Log the first one!</p>
              </div>
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
              <div className="card p-6 text-center">
                <p className="text-text-muted text-xs">No files attached</p>
              </div>
            )}
            {files?.map((file) => (
              <div key={file.id} className="card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Paperclip size={14} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{file.filename}</p>
                  <p className="text-xs text-text-muted">{formatFileSize(file.size_bytes)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={filesApi.downloadUrl(file.id)}
                    target="_blank"
                    className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                  >
                    <Download size={13} />
                  </a>
                  {user?.role !== 'viewer' && (
                    <button
                      onClick={() => deleteFileMutation.mutate(file.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Contact" size="lg">
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
      <Modal isOpen={activityOpen} onClose={() => setActivityOpen(false)} title="Log Activity" size="md">
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
