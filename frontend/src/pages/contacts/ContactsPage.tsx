import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, ChevronUp, ChevronDown, MoreHorizontal,
  Trash2, Eye, Mail, Phone,
} from 'lucide-react';
import { contactsApi } from '../../api/contacts';
import { exportApi } from '../../api/export';
import { SearchInput } from '../../components/ui/SearchInput';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { ContactForm } from '../../components/forms/ContactForm';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import {
  formatDate, timeAgo, LIFECYCLE_COLORS, getLeadScoreColor, capitalize
} from '../../utils/helpers';
import { clsx } from 'clsx';

const LIFECYCLE_STAGES = ['lead', 'prospect', 'customer', 'churned'];

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search, lifecycle_stage: selectedStage, sort_by: sortBy, sort_order: sortOrder }],
    queryFn: () => contactsApi.list({ search, lifecycle_stage: selectedStage || undefined, sort_by: sortBy, sort_order: sortOrder, limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      addToast({ type: 'success', title: 'Contact deleted' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to delete contact' }),
  });

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Contacts</h1>
          <p className="text-text-muted mt-1 text-sm">
            {data?.total ?? 0} contacts in your workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportApi.contacts()} className="btn-secondary btn-sm">
            <Download size={14} />
            Export CSV
          </button>
          {user?.role !== 'viewer' && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-sm">
              <Plus size={14} />
              Add Contact
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <SearchInput
          className="flex-1 min-w-48 max-w-sm"
          placeholder="Search by name, email, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Stage filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedStage('')}
            className={clsx('badge cursor-pointer transition-all', selectedStage === '' ? 'bg-primary-500/10 text-primary-400 border-primary-500/30 border' : 'text-text-muted bg-bg-hover border border-surface-border hover:border-surface-muted')}
          >
            All
          </button>
          {LIFECYCLE_STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStage(s === selectedStage ? '' : s)}
              className={clsx('badge cursor-pointer transition-all', selectedStage === s ? LIFECYCLE_COLORS[s] : 'text-text-muted bg-bg-hover border border-surface-border hover:border-surface-muted')}
            >
              {capitalize(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><PageLoader /></div>
        ) : data?.contacts.length === 0 ? (
          <EmptyState
            title="No contacts found"
            description="Start by adding your first contact or adjust your search filters."
            action={
              <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-md">
                <Plus size={14} /> Add Contact
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border bg-bg-elevated">
                  {[
                    { label: 'Name', col: 'first_name' },
                    { label: 'Email / Phone', col: null },
                    { label: 'Company', col: null },
                    { label: 'Stage', col: 'lifecycle_stage' },
                    { label: 'Lead Score', col: 'lead_score' },
                    { label: 'Last Activity', col: 'last_activity_at' },
                    { label: 'Created', col: 'created_at' },
                    { label: '', col: null },
                  ].map(({ label, col }) => (
                    <th
                      key={label}
                      className={clsx(
                        'text-left text-xs font-semibold text-text-muted uppercase tracking-wide px-4 py-3',
                        col && 'cursor-pointer hover:text-text-primary select-none'
                      )}
                      onClick={() => col && handleSort(col)}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {col && <SortIcon col={col} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data?.contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="table-row-hover"
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={contact.first_name} lastName={contact.last_name} avatarUrl={null} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.source && (
                            <p className="text-xs text-text-muted">{contact.source}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {contact.email && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <Mail size={11} className="text-text-muted" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <Phone size={11} className="text-text-muted" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-secondary">{contact.company_name || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge', LIFECYCLE_COLORS[contact.lifecycle_stage])}>
                        {capitalize(contact.lifecycle_stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-sm font-bold', getLeadScoreColor(contact.lead_score))}>
                          {contact.lead_score}
                        </span>
                        <div className="w-16 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full', {
                              'bg-emerald-500': contact.lead_score >= 80,
                              'bg-yellow-500': contact.lead_score >= 50 && contact.lead_score < 80,
                              'bg-orange-500': contact.lead_score >= 25 && contact.lead_score < 50,
                              'bg-red-500': contact.lead_score < 25,
                            })}
                            style={{ width: `${contact.lead_score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {timeAgo(contact.last_activity_at ?? undefined)}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatDate(contact.created_at ?? undefined)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === contact.id ? null : contact.id)}
                          className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {menuOpen === contact.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-8 w-40 bg-bg-elevated border border-surface-border rounded-xl shadow-elevated z-20 py-1 animate-fade-in">
                              <button
                                onClick={() => { navigate(`/contacts/${contact.id}`); setMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                              >
                                <Eye size={13} /> View
                              </button>
                              {user?.role !== 'viewer' && (
                                <button
                                  onClick={() => { deleteMutation.mutate(contact.id); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New Contact" size="lg">
        <ContactForm
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
};
