import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Download, ChevronUp, ChevronDown, MoreHorizontal,
  Trash2, Eye, Mail, Phone, X, ExternalLink, Calendar, Building2, Paperclip, UserCheck,
  Users, UserPlus, Target, FileText, CheckCircle2, XCircle
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer
} from 'recharts';
import { contactsApi } from '../../api/contacts';
import { activitiesApi } from '../../api/activities';
import { filesApi } from '../../api/files';
import { exportApi } from '../../api/export';
import { SearchInput } from '../../components/ui/SearchInput';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoader, TableSkeleton } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { ContactForm } from '../../components/forms/ContactForm';
import { ActivityForm } from '../../components/forms/ActivityForm';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import {
  formatDate, timeAgo, LIFECYCLE_COLORS, getLeadScoreColor, capitalize, formatFileSize, ACTIVITY_ICONS, ACTIVITY_COLORS
} from '../../utils/helpers';
import { clsx } from 'clsx';

const LIFECYCLE_STAGES = ['lead', 'prospect', 'customer', 'churned'];

// Sparkline mock data arrays for KPI cards
const MOCK_SPARKLINE_DATA_1 = [{ val: 10 }, { val: 15 }, { val: 12 }, { val: 20 }, { val: 18 }, { val: 25 }, { val: 22 }, { val: 30 }];
const MOCK_SPARKLINE_DATA_2 = [{ val: 5 }, { val: 8 }, { val: 12 }, { val: 15 }, { val: 20 }, { val: 25 }, { val: 35 }, { val: 40 }];
const MOCK_SPARKLINE_DATA_3 = [{ val: 8 }, { val: 12 }, { val: 10 }, { val: 18 }, { val: 15 }, { val: 22 }, { val: 20 }, { val: 28 }];
const MOCK_SPARKLINE_DATA_4 = [{ val: 12 }, { val: 10 }, { val: 15 }, { val: 18 }, { val: 20 }, { val: 24 }, { val: 22 }, { val: 26 }];
const MOCK_SPARKLINE_DATA_5 = [{ val: 2 }, { val: 4 }, { val: 8 }, { val: 12 }, { val: 15 }, { val: 20 }, { val: 22 }, { val: 28 }];
const MOCK_SPARKLINE_DATA_6 = [{ val: 1 }, { val: 3 }, { val: 2 }, { val: 5 }, { val: 4 }, { val: 7 }, { val: 6 }, { val: 8 }];

interface LeadKPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: string;
  percentage?: string;
  sparklineColor: string;
  sparklineData: { val: number }[];
}

const LeadKPICard: React.FC<LeadKPICardProps> = ({
  title, value, icon, iconBg, subtitle, percentage, sparklineColor, sparklineData
}) => (
  <div className="relative overflow-hidden rounded-xl border border-surface-border bg-bg-card/45 backdrop-blur-md p-3 px-3.5 pb-2.5 transition-all duration-300 hover:-translate-y-[2px] hover:shadow-card hover:border-primary-500/25 group flex flex-col justify-between min-h-[105px]">
    <div className="flex items-start justify-between relative z-10">
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-bold text-text-primary tracking-tight leading-none pt-0.5">{value}</p>
      </div>
      <div className={clsx('p-1.5 rounded-lg transition-all duration-300 group-hover:scale-105 shadow-sm border border-surface-border/40', iconBg)}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 13 })}
      </div>
    </div>

    {/* Recharts background sparkline */}
    <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-300">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`leadKpiG-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="val"
            stroke={sparklineColor}
            strokeWidth={1}
            fill={`url(#leadKpiG-${title.replace(/\s+/g, '')})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-surface-border/20 relative z-10">
      <p className="text-[9px] text-text-muted font-semibold truncate max-w-full">{subtitle}</p>
      {percentage && (
        <span className="text-[9px] text-text-muted font-bold bg-bg-hover px-1.5 py-0.5 rounded border border-surface-border/40">
          {percentage}
        </span>
      )}
    </div>
  </div>
);

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Drawer state
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [drawerActivityOpen, setDrawerActivityOpen] = useState(false);

  // Auto open create modal if URL ends with /new
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setShowCreateModal(true);
    }
  }, [location]);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search, lifecycle_stage: selectedStage, sort_by: sortBy, sort_order: sortOrder }],
    queryFn: () => contactsApi.list({ search, lifecycle_stage: selectedStage || undefined, sort_by: sortBy, sort_order: sortOrder, limit: 100 }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['contacts', 'all_for_stats'],
    queryFn: () => contactsApi.list({ limit: 1000 }),
  });

  const deleteMutation = useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      addToast({ type: 'success', title: 'Contact deleted' });
      if (selectedContactId) setSelectedContactId(null);
    },
    onError: () => addToast({ type: 'error', title: 'Failed to delete contact' }),
  });

  const stats = useMemo(() => {
    const list = statsData?.contacts || data?.contacts || [];
    const total = list.length;
    
    const newCount = list.filter(c => c.lifecycle_stage === 'lead').length;
    const qualifiedCount = list.filter(c => c.lifecycle_stage === 'prospect').length;
    
    const proposalCount = list.filter(c => 
      (c.tags && c.tags.some((t: string) => t.toLowerCase().includes('proposal') || t.toLowerCase().includes('sent'))) ||
      c.lead_score >= 70
    ).length;
    
    const wonCount = list.filter(c => c.lifecycle_stage === 'customer').length;
    const lostCount = list.filter(c => c.lifecycle_stage === 'churned').length;

    const getPct = (count: number) => total > 0 ? `${Math.round((count / total) * 100)}%` : '0%';

    return {
      total,
      new: newCount,
      newPct: getPct(newCount),
      qualified: qualifiedCount,
      qualifiedPct: getPct(qualifiedCount),
      proposal: proposalCount,
      proposalPct: getPct(proposalCount),
      won: wonCount,
      wonPct: getPct(wonCount),
      lost: lostCount,
      lostPct: getPct(lostCount),
    };
  }, [statsData?.contacts, data?.contacts]);

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
    return sortOrder === 'asc' ? <ChevronUp size={12} className="opacity-80" /> : <ChevronDown size={12} className="opacity-80" />;
  };

  // ─── Details Drawer Component ─────────────────────────────────────────────
  const DetailsDrawer: React.FC<{ contactId: string; onClose: () => void }> = ({ contactId, onClose }) => {
    const { data: contact, isLoading: contactLoading } = useQuery({
      queryKey: ['contact', contactId],
      queryFn: () => contactsApi.get(contactId),
      enabled: !!contactId,
    });

    const { data: activities, isLoading: actLoading } = useQuery({
      queryKey: ['activities', 'contact', contactId],
      queryFn: () => activitiesApi.list({ contact_id: contactId, limit: 20 }),
      enabled: !!contactId,
    });

    const { data: files } = useQuery({
      queryKey: ['files', 'contact', contactId],
      queryFn: () => filesApi.list({ contact_id: contactId }),
      enabled: !!contactId,
    });

    const uploadFileMutation = useMutation({
      mutationFn: (file: File) => filesApi.upload(file, { contact_id: contactId }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['files', 'contact', contactId] });
        addToast({ type: 'success', title: 'File uploaded' });
      },
    });

    const deleteFileMutation = useMutation({
      mutationFn: filesApi.delete,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['files', 'contact', contactId] });
        addToast({ type: 'success', title: 'File deleted' });
      },
    });

    if (contactLoading) {
      return (
        <div className="w-80 sm:w-[500px] border-l border-surface-border bg-bg-card p-6 flex flex-col justify-center h-full">
          <PageLoader />
        </div>
      );
    }

    if (!contact) {
      return (
        <div className="w-80 sm:w-[500px] border-l border-surface-border bg-bg-card p-6 flex flex-col justify-center h-full text-center">
          <p className="text-text-muted">Contact details not found</p>
          <button onClick={onClose} className="btn-secondary btn-sm mt-3 self-center">Close</button>
        </div>
      );
    }

    return (
      <div className="w-80 sm:w-[500px] border-l border-surface-border bg-bg-card flex flex-col h-full overflow-hidden animate-slide-in-right shadow-2xl relative z-40">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Quick Details</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigate(`/contacts/${contact.id}`);
                onClose();
              }}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all border border-transparent hover:border-surface-border"
              title="Open full profile"
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all border border-transparent hover:border-surface-border"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Main profile details */}
          <div className="flex items-center gap-4">
            <Avatar firstName={contact.first_name} lastName={contact.last_name} size="lg" className="shadow-sm border border-surface-border/50" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-text-primary truncate">
                {contact.first_name} {contact.last_name}
              </h2>
              {contact.company_name && (
                <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5 font-medium">
                  <Building2 size={12} /> {contact.company_name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={clsx('badge text-[10px] py-0 px-2', LIFECYCLE_COLORS[contact.lifecycle_stage])}>
                  {capitalize(contact.lifecycle_stage)}
                </span>
                <span className={clsx('text-xs font-bold', getLeadScoreColor(contact.lead_score))}>
                  Score: {contact.lead_score}
                </span>
              </div>
            </div>
          </div>

          {/* Quick info grid */}
          <div className="grid grid-cols-2 gap-4 bg-bg bg-opacity-40 border border-surface-border rounded-xl p-3.5 text-xs">
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Email</p>
              <p className="text-xs text-text-primary truncate flex items-center gap-1.5 font-medium">
                <Mail size={11} className="text-text-muted" />
                {contact.email || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Phone</p>
              <p className="text-xs text-text-primary truncate flex items-center gap-1.5 font-medium">
                <Phone size={11} className="text-text-muted" />
                {contact.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Source</p>
              <p className="text-xs text-text-primary font-medium">{contact.source || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Created</p>
              <p className="text-xs text-text-primary font-medium flex items-center gap-1.5">
                <Calendar size={11} className="text-text-muted" />
                {formatDate(contact.created_at ?? undefined)}
              </p>
            </div>
          </div>

          {/* Log Activity Quick Form */}
          <div className="border-t border-surface-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Log Activity</h3>
              <button
                onClick={() => setDrawerActivityOpen(!drawerActivityOpen)}
                className="text-[10px] text-primary-400 hover:text-primary-300 font-bold uppercase"
              >
                {drawerActivityOpen ? 'Cancel' : 'Quick Log'}
              </button>
            </div>
            {drawerActivityOpen && (
              <div className="bg-bg bg-opacity-45 p-3 rounded-xl border border-surface-border mb-4">
                <ActivityForm
                  contactId={contact.id}
                  onSuccess={() => {
                    setDrawerActivityOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['activities', 'contact', contactId] });
                    queryClient.invalidateQueries({ queryKey: ['contacts'] });
                  }}
                  onCancel={() => setDrawerActivityOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Activities list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Activity History</h3>
            {actLoading ? (
              <div className="py-4 text-center"><PageLoader /></div>
            ) : activities?.activities.length === 0 ? (
              <p className="text-xs text-text-muted py-2">No activities logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activities?.activities.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-xl border border-surface-border/60 bg-bg bg-opacity-30 flex items-start gap-2.5">
                    <div className={clsx('w-6.5 h-6.5 rounded-lg flex items-center justify-center text-xs shrink-0', ACTIVITY_COLORS[act.type])}>
                      {ACTIVITY_ICONS[act.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-text-primary leading-tight truncate">{act.title}</p>
                        <span className="text-[9px] text-text-muted whitespace-nowrap">{timeAgo(act.created_at ?? undefined)}</span>
                      </div>
                      {act.body && <p className="text-[11px] text-text-muted mt-0.5 leading-snug line-clamp-2">{act.body}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files List */}
          <div className="space-y-3 border-t border-surface-border pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Attached Files</h3>
              {user?.role !== 'viewer' && (
                <label className="text-[10px] text-primary-400 hover:text-primary-300 font-bold uppercase cursor-pointer flex items-center gap-1">
                  <Paperclip size={11} /> Upload
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
                <p className="text-xs text-text-muted">No files attached.</p>
              )}
              {files?.map((file) => (
                <div key={file.id} className="p-2 rounded-lg border border-surface-border bg-bg bg-opacity-30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip size={12} className="text-blue-400 shrink-0" />
                    <span className="truncate max-w-[200px] text-text-primary font-medium">{file.filename}</span>
                    <span className="text-[9px] text-text-muted font-semibold">({formatFileSize(file.size_bytes)})</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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

        {/* Action buttons footer */}
        {user?.role !== 'viewer' && (
          <div className="p-4 border-t border-surface-border bg-bg-card flex items-center gap-2">
            <button
              onClick={() => {
                navigate(`/contacts/${contact.id}/assign`);
                onClose();
              }}
              className="btn-secondary btn-sm flex-1"
            >
              <UserCheck size={13} /> Assign
            </button>
            <button
              onClick={() => {
                deleteMutation.mutate(contact.id);
              }}
              className="btn-danger btn-sm flex-1"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-6 relative">
      {/* Main Table Screen */}
      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Leads (Contacts)</h1>
            <p className="text-text-muted text-xs mt-0.5 font-medium">
              {data?.total ?? 0} total leads in workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => exportApi.contacts()} 
              className="btn-secondary btn-sm flex items-center gap-1"
            >
              <Download size={13} />
              Export
            </button>
            {user?.role !== 'viewer' && (
              <button 
                onClick={() => {
                  setShowCreateModal(true);
                  navigate('/contacts/new');
                }} 
                className="btn-primary btn-sm flex items-center gap-1"
              >
                <Plus size={13} />
                Add Contact
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            className="flex-1 min-w-[200px] max-w-sm"
            placeholder="Search by name, company, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Stage pills filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedStage('')}
              className={clsx(
                'badge text-[10px] py-1 cursor-pointer transition-all border', 
                selectedStage === '' 
                  ? 'bg-primary-500/10 text-primary-400 border-primary-500/20 shadow-sm' 
                  : 'text-text-secondary bg-bg bg-opacity-40 border-surface-border hover:border-surface-muted'
              )}
            >
              All Stages
            </button>
            {LIFECYCLE_STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStage(s === selectedStage ? '' : s)}
                className={clsx(
                  'badge text-[10px] py-1 cursor-pointer transition-all border', 
                  selectedStage === s 
                    ? LIFECYCLE_COLORS[s] 
                    : 'text-text-secondary bg-bg bg-opacity-40 border-surface-border hover:border-surface-muted'
                )}
              >
                {capitalize(s)}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Statistics Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <LeadKPICard
            title="Total Leads"
            value={stats.total}
            icon={<Users />}
            iconBg="bg-indigo-500/10 text-indigo-400 border-indigo-500/10"
            subtitle="Active pipeline leads"
            sparklineColor="#6366F1"
            sparklineData={MOCK_SPARKLINE_DATA_1}
          />
          <LeadKPICard
            title="New Leads"
            value={stats.new}
            icon={<UserPlus />}
            iconBg="bg-blue-500/10 text-blue-400 border-blue-500/10"
            subtitle="Awaiting first contact"
            percentage={stats.newPct}
            sparklineColor="#3B82F6"
            sparklineData={MOCK_SPARKLINE_DATA_2}
          />
          <LeadKPICard
            title="Qualified"
            value={stats.qualified}
            icon={<Target />}
            iconBg="bg-amber-500/10 text-amber-400 border-amber-500/10"
            subtitle="Prospects identified"
            percentage={stats.qualifiedPct}
            sparklineColor="#F59E0B"
            sparklineData={MOCK_SPARKLINE_DATA_3}
          />
          <LeadKPICard
            title="Proposal Sent"
            value={stats.proposal}
            icon={<FileText />}
            iconBg="bg-pink-500/10 text-pink-400 border-pink-500/10"
            subtitle="Offer details delivered"
            percentage={stats.proposalPct}
            sparklineColor="#EC4899"
            sparklineData={MOCK_SPARKLINE_DATA_4}
          />
          <LeadKPICard
            title="Won Leads"
            value={stats.won}
            icon={<CheckCircle2 />}
            iconBg="bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
            subtitle="Successfully converted"
            percentage={stats.wonPct}
            sparklineColor="#10B981"
            sparklineData={MOCK_SPARKLINE_DATA_5}
          />
          <LeadKPICard
            title="Lost Leads"
            value={stats.lost}
            icon={<XCircle />}
            iconBg="bg-red-500/10 text-red-400 border-red-500/10"
            subtitle="Disengaged / churned"
            percentage={stats.lostPct}
            sparklineColor="#EF4444"
            sparklineData={MOCK_SPARKLINE_DATA_6}
          />
        </div>

        {/* Table Body Card */}
        <div className="card flex-1 overflow-hidden flex flex-col relative">
          {isLoading ? (
            <div className="p-8"><TableSkeleton cols={6} rows={6} /></div>
          ) : data?.contacts.length === 0 ? (
            <EmptyState
              title="No leads found"
              description="Start by adding your first lead or adjust search filtering."
              action={
                user?.role !== 'viewer' ? (
                  <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-md">
                    <Plus size={14} /> Add Lead
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-bg-elevated sticky top-0 z-10">
                    {[
                      { label: 'Name', col: 'first_name' },
                      { label: 'Contact Details', col: null },
                      { label: 'Company', col: null },
                      { label: 'Lifecycle Stage', col: 'lifecycle_stage' },
                      { label: 'Score', col: 'lead_score' },
                      { label: 'Last Active', col: 'last_activity_at' },
                      { label: '', col: null },
                    ].map(({ label, col }) => (
                      <th
                        key={label}
                        className={clsx(
                          'text-left text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 py-3 select-none border-b border-surface-border',
                          col && 'cursor-pointer hover:text-text-primary'
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
                <tbody className="divide-y divide-surface-border/50">
                  {data?.contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={clsx(
                        "table-row-hover",
                        selectedContactId === contact.id ? "bg-bg-hover bg-opacity-70 border-l-2 border-primary-500" : ""
                      )}
                      onClick={() => setSelectedContactId(contact.id)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar firstName={contact.first_name} lastName={contact.last_name} size="sm" className="shadow-sm border border-surface-border/50" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">
                              {contact.first_name} {contact.last_name}
                            </p>
                            {contact.source && (
                              <p className="text-[10px] text-text-muted font-medium">{contact.source}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="space-y-0.5 text-[11px] text-text-secondary font-medium">
                          {contact.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail size={10} className="text-text-muted" />
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={10} className="text-text-muted" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium text-text-secondary">{contact.company_name || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={clsx('badge text-[9px] py-0 px-2 font-bold', LIFECYCLE_COLORS[contact.lifecycle_stage])}>
                          {capitalize(contact.lifecycle_stage)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={clsx('text-xs font-bold w-4', getLeadScoreColor(contact.lead_score))}>
                            {contact.lead_score}
                          </span>
                          <div className="w-14 h-1 bg-bg-hover rounded-full overflow-hidden hidden sm:block border border-surface-border/30">
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
                      <td className="px-4 py-2.5 text-[11px] text-text-muted font-medium">
                        {timeAgo(contact.last_activity_at ?? undefined)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setMenuOpen(menuOpen === contact.id ? null : contact.id)}
                            className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors border border-transparent hover:border-surface-border"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {menuOpen === contact.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                              <div className="absolute right-0 top-7 w-32 bg-bg-elevated border border-surface-border rounded-xl shadow-elevated z-20 py-1 p-1 animate-fade-in text-left">
                                <button
                                  onClick={() => { navigate(`/contacts/${contact.id}`); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
                                >
                                  <Eye size={12} /> View Full
                                </button>
                                {user?.role !== 'viewer' && (
                                  <button
                                    onClick={() => { deleteMutation.mutate(contact.id); setMenuOpen(null); }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={12} /> Delete
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
      </div>

      {/* Details drawer mount */}
      {selectedContactId && (
        <>
          {/* Drawer Backdrop overlay */}
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30 xl:hidden" onClick={() => setSelectedContactId(null)} />
          <DetailsDrawer contactId={selectedContactId} onClose={() => setSelectedContactId(null)} />
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); navigate('/contacts'); }} title="Add New Contact" size="lg">
        <ContactForm
          onSuccess={() => {
            setShowCreateModal(false);
            navigate('/contacts');
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
          onCancel={() => { setShowCreateModal(false); navigate('/contacts'); }}
        />
      </Modal>
    </div>
  );
};
