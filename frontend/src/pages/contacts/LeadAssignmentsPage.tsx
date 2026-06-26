import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Phone,
  Building2,
  Star,
  Filter,
  LayoutGrid,
  List,
  TrendingUp,
} from 'lucide-react';
import { contactsApi } from '../../api/contacts';
import { usersApi } from '../../api/users';
import { Avatar } from '../../components/ui/Avatar';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { ROLE_LABELS, ROLE_COLORS, LIFECYCLE_COLORS, getLeadScoreColor } from '../../utils/helpers';
import { clsx } from 'clsx';
import type { Contact, User } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmployeeGroup {
  user: User;
  leads: Contact[];
}

// ─── Stats Card ─────────────────────────────────────────────────────────────

const StatPill: React.FC<{ icon: React.ReactNode; label: string; value: number; accent: string }> = ({
  icon, label, value, accent,
}) => (
  <div className={clsx(
    'flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]',
    accent
  )}>
    <div className="shrink-0">{icon}</div>
    <div>
      <p className="text-2xl font-bold text-text-primary leading-none">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  </div>
);

// ─── Lead Card ──────────────────────────────────────────────────────────────

const LeadCard: React.FC<{ lead: Contact; onClick: () => void }> = ({ lead, onClick }) => (
  <div
    onClick={onClick}
    className="group p-3.5 rounded-xl bg-bg-elevated/60 border border-surface-border hover:border-primary-500/30 hover:bg-bg-hover/50 transition-all duration-200 cursor-pointer"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary truncate group-hover:text-primary-400 transition-colors">
          {lead.first_name} {lead.last_name || ''}
        </p>
        {lead.company_name && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-text-muted">
            <Building2 size={10} className="shrink-0" />
            <span className="truncate">{lead.company_name}</span>
          </div>
        )}
      </div>
      <ExternalLink size={12} className="text-text-muted/40 group-hover:text-primary-400 shrink-0 mt-0.5 transition-colors" />
    </div>

    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <span className={clsx(
        'badge py-0 px-1.5 text-[10px] border capitalize',
        LIFECYCLE_COLORS[lead.lifecycle_stage] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30'
      )}>
        {lead.lifecycle_stage}
      </span>
      {lead.lead_score > 0 && (
        <span className={clsx('flex items-center gap-0.5 text-[10px] font-semibold', getLeadScoreColor(lead.lead_score))}>
          <Star size={9} /> {lead.lead_score}
        </span>
      )}
    </div>

    <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted/70">
      {lead.email && (
        <span className="flex items-center gap-0.5 truncate">
          <Mail size={9} className="shrink-0" /> {lead.email}
        </span>
      )}
      {lead.phone && (
        <span className="flex items-center gap-0.5">
          <Phone size={9} className="shrink-0" /> {lead.phone}
        </span>
      )}
    </div>
  </div>
);

// ─── Employee Section ───────────────────────────────────────────────────────

const EmployeeSection: React.FC<{
  group: EmployeeGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onLeadClick: (id: string) => void;
}> = ({ group, isExpanded, onToggle, onLeadClick }) => {
  const { user, leads } = group;

  return (
    <div className="card overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/5">
      {/* Employee Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-hover/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <Avatar firstName={user.first_name} lastName={user.last_name} avatarUrl={user.avatar_url} size="md" />
            <div className={clsx(
              'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-bg-card',
              leads.length > 0 ? 'bg-primary-500 text-white' : 'bg-gray-600 text-gray-300'
            )}>
              {leads.length}
            </div>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-text-primary truncate">
              {user.first_name} {user.last_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={clsx('badge py-0 px-1.5 text-[10px] border', ROLE_COLORS[user.role] ?? ROLE_COLORS['viewer'])}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              {user.department && (
                <span className="text-[10px] text-text-muted/60">• {user.department}</span>
              )}
              {user.job_title && (
                <span className="text-[10px] text-text-muted/60">• {user.job_title}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted bg-bg-elevated px-2 py-1 rounded-lg">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Leads Grid */}
      {isExpanded && (
        <div className="border-t border-surface-border p-4 animate-fade-in">
          {leads.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4 italic">
              No leads assigned to this member.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {leads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export const LeadAssignmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');

  // Fetch all contacts (no limit, get maximum)
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts', 'all-for-assignments'],
    queryFn: () => contactsApi.list({ limit: 100 }),
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: usersApi.listAll,
  });

  const contacts = contactsData?.contacts ?? [];
  const activeUsers = useMemo(() => (users ?? []).filter(u => u.is_active), [users]);

  // O(1) user lookup map — shared across grouped + table views
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    activeUsers.forEach(u => map.set(u.id, u));
    return map;
  }, [activeUsers]);

  // Pre-compute lowercased search term once per change
  const searchLower = useMemo(() => searchTerm.toLowerCase(), [searchTerm]);

  // Shared filter predicate — O(1) per contact via HashMap
  const matchesFilter = useMemo(() => {
    return (c: Contact): boolean => {
      if (c.lifecycle_stage === 'deleted') return false;
      if (filterUserId !== 'all' && c.owner_id !== filterUserId) return false;
      if (!searchLower) return true;

      const leadName = `${c.first_name} ${c.last_name || ''}`.toLowerCase();
      const ownerUser = userMap.get(c.owner_id);
      const ownerName = ownerUser ? `${ownerUser.first_name} ${ownerUser.last_name}`.toLowerCase() : '';
      const company = (c.company_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();

      return leadName.includes(searchLower) || ownerName.includes(searchLower) || company.includes(searchLower) || email.includes(searchLower);
    };
  }, [searchLower, filterUserId, userMap]);

  // Group leads by owner — single pass O(n) with HashMap
  const { groups, unassignedLeads } = useMemo(() => {
    const grouped = new Map<string, Contact[]>();
    const unassigned: Contact[] = [];

    contacts.forEach(c => {
      if (!matchesFilter(c)) return;

      const ownerUser = userMap.get(c.owner_id);
      if (!ownerUser) {
        unassigned.push(c);
      } else {
        const bucket = grouped.get(c.owner_id);
        if (bucket) bucket.push(c);
        else grouped.set(c.owner_id, [c]);
      }
    });

    const result: EmployeeGroup[] = activeUsers
      .filter(u => filterUserId === 'all' || u.id === filterUserId)
      .map(u => ({
        user: u,
        leads: grouped.get(u.id) ?? [],
      }))
      .sort((a, b) => b.leads.length - a.leads.length);

    return { groups: result, unassignedLeads: unassigned };
  }, [contacts, activeUsers, matchesFilter, filterUserId, userMap]);

  // Pre-computed table rows — avoids re-filtering in JSX render
  const filteredTableRows = useMemo(() => {
    return contacts
      .filter(matchesFilter)
      .map(lead => ({ lead, owner: userMap.get(lead.owner_id) ?? null }));
  }, [contacts, matchesFilter, userMap]);

  // Stats — cached count
  const totalLeads = useMemo(() => contacts.filter(c => c.lifecycle_stage !== 'deleted').length, [contacts]);
  const assignedLeads = totalLeads - unassignedLeads.length;

  const toggleExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(groups.map(g => g.user.id));
    if (unassignedLeads.length > 0) allIds.add('__unassigned__');
    setExpandedUsers(allIds);
  };

  const collapseAll = () => setExpandedUsers(new Set());

  if (contactsLoading || usersLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <UserCheck className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            Tasks
          </h1>
          <p className="text-text-muted text-sm mt-1 ml-[46px]">
            Overview of which tasks are assigned to which team members.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill
          icon={<Users size={20} className="text-primary-400" />}
          label="Total Leads"
          value={totalLeads}
          accent="bg-primary-500/5 border-primary-500/20"
        />
        <StatPill
          icon={<UserCheck size={20} className="text-emerald-400" />}
          label="Assigned"
          value={assignedLeads}
          accent="bg-emerald-500/5 border-emerald-500/20"
        />
        <StatPill
          icon={<UserX size={20} className="text-amber-400" />}
          label="Unassigned"
          value={unassignedLeads.length}
          accent="bg-amber-500/5 border-amber-500/20"
        />
        <StatPill
          icon={<TrendingUp size={20} className="text-blue-400" />}
          label="Team Members"
          value={activeUsers.length}
          accent="bg-blue-500/5 border-blue-500/20"
        />
      </div>

      {/* Controls Bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
            <input
              type="text"
              placeholder="Search by lead name, employee, company, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-bg-elevated border border-surface-border rounded-lg text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            />
          </div>

          {/* Filter by Employee */}
          <div className="relative min-w-[180px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <select
              value={filterUserId}
              onChange={e => setFilterUserId(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-bg-elevated border border-surface-border rounded-lg text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Employees</option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-surface-border overflow-hidden">
            <button
              onClick={() => setViewMode('grouped')}
              className={clsx(
                'px-3 py-2 transition-colors',
                viewMode === 'grouped' ? 'bg-primary-500/10 text-primary-400' : 'bg-bg-elevated text-text-muted hover:text-text-primary'
              )}
              title="Grouped View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={clsx(
                'px-3 py-2 transition-colors border-l border-surface-border',
                viewMode === 'table' ? 'bg-primary-500/10 text-primary-400' : 'bg-bg-elevated text-text-muted hover:text-text-primary'
              )}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>

          {/* Expand / Collapse */}
          {viewMode === 'grouped' && (
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="px-3 py-2 text-xs bg-bg-elevated border border-surface-border rounded-lg text-text-muted hover:text-text-primary hover:border-surface-muted transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 text-xs bg-bg-elevated border border-surface-border rounded-lg text-text-muted hover:text-text-primary hover:border-surface-muted transition-colors"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grouped' ? (
        <div className="space-y-3">
          {/* Unassigned leads section */}
          {unassignedLeads.length > 0 && (
            <div className="card overflow-hidden border-amber-500/20 transition-all duration-300">
              <button
                onClick={() => toggleExpand('__unassigned__')}
                className="w-full flex items-center justify-between p-4 hover:bg-bg-hover/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <UserX size={18} className="text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-amber-400">Unassigned Leads</p>
                    <p className="text-[10px] text-text-muted mt-0.5">These leads have no active owner</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                    {unassignedLeads.length} lead{unassignedLeads.length !== 1 ? 's' : ''}
                  </span>
                  {expandedUsers.has('__unassigned__') ? (
                    <ChevronUp size={16} className="text-text-muted" />
                  ) : (
                    <ChevronDown size={16} className="text-text-muted" />
                  )}
                </div>
              </button>
              {expandedUsers.has('__unassigned__') && (
                <div className="border-t border-surface-border p-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {unassignedLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead} onClick={() => navigate(`/contacts/${lead.id}`)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Employee groups */}
          {groups.map(group => (
            <EmployeeSection
              key={group.user.id}
              group={group}
              isExpanded={expandedUsers.has(group.user.id)}
              onToggle={() => toggleExpand(group.user.id)}
              onLeadClick={(id) => navigate(`/contacts/${id}`)}
            />
          ))}

          {groups.length === 0 && unassignedLeads.length === 0 && (
            <div className="card p-12 text-center">
              <Users size={40} className="mx-auto text-text-muted/30 mb-4" />
              <p className="text-text-muted text-sm">No leads match your search or filter criteria.</p>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredTableRows.map(({ lead, owner }) => (
                      <tr
                        key={lead.id}
                        onClick={() => navigate(`/contacts/${lead.id}`)}
                        className="hover:bg-bg-hover/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar firstName={lead.first_name} lastName={lead.last_name || undefined} size="xs" />
                            <div>
                              <p className="font-medium text-text-primary">
                                {lead.first_name} {lead.last_name || ''}
                              </p>
                              {lead.email && (
                                <p className="text-[11px] text-text-muted truncate max-w-[180px]">{lead.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">{lead.company_name || '—'}</td>
                        <td className="px-4 py-3">
                          {owner ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-[9px] font-bold">
                                {owner.first_name[0]}{owner.last_name?.[0] || ''}
                              </div>
                              <span className="text-xs text-text-primary font-medium">
                                {owner.first_name} {owner.last_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            'badge py-0 px-1.5 text-[10px] border capitalize',
                            LIFECYCLE_COLORS[lead.lifecycle_stage] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30'
                          )}>
                            {lead.lifecycle_stage}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('text-xs font-semibold', getLeadScoreColor(lead.lead_score))}>
                            {lead.lead_score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs capitalize">{lead.source || '—'}</td>
                      </tr>
                ))}
              </tbody>
            </table>
            {contacts.filter(c => c.lifecycle_stage !== 'deleted').length === 0 && (
              <div className="p-12 text-center">
                <Users size={40} className="mx-auto text-text-muted/30 mb-4" />
                <p className="text-text-muted text-sm">No leads found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
