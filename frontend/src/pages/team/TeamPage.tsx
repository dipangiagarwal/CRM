import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, MoreHorizontal, UserCheck, UserX, ArrowRightLeft,
  Upload, Shield, LayoutGrid, Users, Crown, ChevronDown,
} from 'lucide-react';
import { usersApi } from '../../api/users';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { timeAgo, ROLE_COLORS, ROLE_LABELS, DEPARTMENTS } from '../../utils/helpers';
import { clsx } from 'clsx';
import type { User, UserRole } from '../../types';

// All selectable roles for invite / change-role forms
const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin',       label: 'Admin' },
  { value: 'manager',     label: 'Manager' },
  { value: 'developer',   label: 'Developer' },
  { value: 'executive',   label: 'Executive' },
  { value: 'rep',         label: 'Rep' },
  { value: 'viewer',      label: 'Read-Only' },
];

// Roles that count as "team lead" inside a department group
const HEAD_ROLES = new Set(['super_admin', 'admin', 'manager']);

function isHead(u: User): boolean {
  if (HEAD_ROLES.has(u.role)) return true;
  const title = (u.job_title ?? '').toLowerCase();
  return title.includes('head') || title.includes('lead') || title.includes('director') || title.includes('chief');
}

// ── Department Group Card ──────────────────────────────────────────────────────
interface GroupProps {
  dept: string;
  members: User[];
  currentUserId: string;
  isAdmin: boolean;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
  onRoleOpen: (u: User) => void;
  onTransferOpen: (u: User) => void;
}

function DeptGroup({
  dept, members, currentUserId, isAdmin,
  onDeactivate, onActivate, onRoleOpen, onTransferOpen,
}: GroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const heads = members.filter(isHead);
  const reps  = members.filter(u => !isHead(u));

  const deptColors: Record<string, string> = {
    Sales:       'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    Marketing:   'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    Operations:  'from-orange-500/20 to-orange-500/5 border-orange-500/30',
    Engineering: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
    Management:  'from-primary-500/20 to-primary-500/5 border-primary-500/30',
    Support:     'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    Unassigned:  'from-gray-500/20 to-gray-500/5 border-gray-500/30',
  };
  const gradient = deptColors[dept] ?? deptColors['Unassigned'];

  function MemberMenu({ member }: { member: User }) {
    if (!isAdmin || member.id === currentUserId) return null;
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
          className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen === member.id && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
            <div className="absolute right-0 top-8 w-48 bg-bg-elevated border border-surface-border rounded-xl shadow-elevated z-20 py-1 animate-fade-in">
              {member.is_active ? (
                <button
                  onClick={() => { onDeactivate(member.id); setMenuOpen(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <UserX size={13} /> Deactivate
                </button>
              ) : (
                <button
                  onClick={() => { onActivate(member.id); setMenuOpen(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
                >
                  <UserCheck size={13} /> Activate
                </button>
              )}
              <button
                onClick={() => { onRoleOpen(member); setMenuOpen(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              >
                <Shield size={13} /> Change Role
              </button>
              <button
                onClick={() => { onTransferOpen(member); setMenuOpen(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              >
                <ArrowRightLeft size={13} /> Transfer Data
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  function MemberCard({ member, isHeadCard = false }: { member: User; isHeadCard?: boolean }) {
    return (
      <div className={clsx(
        'card p-4 hover:border-surface-muted transition-all duration-200 group',
        isHeadCard && 'ring-1 ring-primary-500/30 bg-primary-500/5',
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatar_url} size="md" />
              {isHeadCard && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center shadow">
                  <Crown size={9} className="text-black" />
                </div>
              )}
              <div className={clsx(
                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-card',
                member.is_active ? 'bg-emerald-500' : 'bg-gray-500'
              )} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-text-primary text-sm truncate">
                {member.first_name} {member.last_name}
                {member.id === currentUserId && <span className="text-xs text-text-muted ml-1">(you)</span>}
              </p>
              <p className="text-xs text-text-muted truncate">{member.email}</p>
              {member.job_title && <p className="text-xs text-text-disabled mt-0.5">{member.job_title}</p>}
            </div>
          </div>
          <MemberMenu member={member} />
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-border">
          <span className={clsx('badge', ROLE_COLORS[member.role] ?? ROLE_COLORS['viewer'])}>
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
          <span className={clsx('badge text-xs',
            member.is_active
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 border'
              : 'text-gray-400 bg-gray-500/10 border-gray-500/30 border'
          )}>
            {member.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {member.last_login_at && (
          <p className="text-xs text-text-disabled mt-2">Last seen {timeAgo(member.last_login_at)}</p>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('rounded-2xl border bg-gradient-to-br p-px', gradient)}>
      <div className="rounded-2xl bg-bg-card/90 backdrop-blur-sm">
        {/* Department Header */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-hover/50 transition-colors rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <Users size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary">{dept}</h2>
            <span className="text-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full border border-surface-border">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <ChevronDown
            size={15}
            className={clsx('text-text-muted transition-transform duration-200', !collapsed && 'rotate-180')}
          />
        </button>

        {!collapsed && (
          <div className="px-5 pb-5 space-y-4">
            {/* Heads Row */}
            {heads.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-disabled uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Crown size={11} className="text-yellow-500" /> Team Lead{heads.length > 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {heads.map(m => <MemberCard key={m.id} member={m} isHeadCard />)}
                </div>
              </div>
            )}

            {/* Connector Visual */}
            {heads.length > 0 && reps.length > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="w-6 h-px bg-surface-border" />
                <div className="h-4 w-px bg-surface-border ml-1" />
                <div className="flex-1 h-px bg-surface-border" />
              </div>
            )}

            {/* Reps Row */}
            {reps.length > 0 && (
              <div>
                {heads.length > 0 && (
                  <p className="text-xs font-semibold text-text-disabled uppercase tracking-widest mb-3">
                    Members
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {reps.map(m => <MemberCard key={m.id} member={m} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export const TeamPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user: currentUser } = useAuthStore();

  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grouped');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState<User | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [roleOpen, setRoleOpen] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('viewer');

  const [inviteForm, setInviteForm] = useState({
    first_name: '', last_name: '', email: '', role: 'executive' as UserRole,
    job_title: '', department: '', password: 'Welcome@1234',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.listAll,
  });

  const inviteMutation = useMutation({
    mutationFn: usersApi.invite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addToast({ type: 'success', title: 'User invited!', message: 'Invite email has been sent.' });
      setInviteOpen(false);
    },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to invite user' }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); addToast({ type: 'success', title: 'Role updated' }); },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to update role' }),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); addToast({ type: 'success', title: 'User deactivated' }); },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Cannot deactivate user' }),
  });

  const activateMutation = useMutation({
    mutationFn: usersApi.activate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); addToast({ type: 'success', title: 'User activated' }); },
  });

  const transferMutation = useMutation({
    mutationFn: ({ fromId, toId }: { fromId: string; toId: string }) => usersApi.transferData(fromId, toId),
    onSuccess: (data) => {
      addToast({ type: 'success', title: 'Data transferred!', message: `${data.contacts_transferred} contacts, ${data.deals_transferred} deals moved.` });
      setTransferOpen(null);
    },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Transfer failed' }),
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Group users by department for the grouped view
  const grouped = useMemo(() => {
    if (!users) return [];
    const map = new Map<string, User[]>();
    for (const u of users) {
      const key = u.department ?? 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    // Sort: known departments first in order, then Unassigned last
    const order = [...DEPARTMENTS, 'Unassigned'];
    return [...map.entries()].sort(([a], [b]) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [users]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Team</h1>
          <p className="text-text-muted mt-1 text-sm">{users?.length ?? 0} members in your workspace</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-bg-elevated border border-surface-border rounded-xl p-1">
            <button
              onClick={() => setViewMode('grouped')}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', viewMode === 'grouped' ? 'bg-primary-500 text-white' : 'text-text-muted hover:text-text-primary')}
            >
              <Users size={13} /> Teams
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-text-muted hover:text-text-primary')}
            >
              <LayoutGrid size={13} /> Grid
            </button>
          </div>

          {isAdmin && (
            <>
              <label className="btn-secondary btn-sm cursor-pointer">
                <Upload size={14} /> Bulk Import
                <input type="file" className="hidden" accept=".csv" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const result = await usersApi.bulkInvite(file);
                    addToast({ type: 'success', title: `Invited ${result.created} users`, message: result.failed > 0 ? `${result.failed} failed` : undefined });
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                  } catch (err: any) {
                    addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Bulk invite failed' });
                  }
                }} />
              </label>
              <button onClick={() => setInviteOpen(true)} className="btn-primary btn-sm">
                <Plus size={14} /> Invite User
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : users?.length === 0 ? (
        <EmptyState title="No team members" description="Invite your first team member to get started." />
      ) : viewMode === 'grouped' ? (
        /* ── Grouped / Team View ── */
        <div className="space-y-4">
          {grouped.map(([dept, members]) => (
            <DeptGroup
              key={dept}
              dept={dept}
              members={members}
              currentUserId={currentUser?.id ?? ''}
              isAdmin={isAdmin}
              onDeactivate={id => deactivateMutation.mutate(id)}
              onActivate={id => activateMutation.mutate(id)}
              onRoleOpen={u => { setRoleOpen(u); setNewRole(u.role as UserRole); }}
              onTransferOpen={u => setTransferOpen(u)}
            />
          ))}
        </div>
      ) : (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users?.map((member) => (
            <div key={member.id} className="card p-5 hover:border-surface-muted transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatar_url} size="md" />
                    <div className={clsx('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-card', member.is_active ? 'bg-emerald-500' : 'bg-gray-500')} />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">
                      {member.first_name} {member.last_name}
                      {member.id === currentUser?.id && <span className="text-xs text-text-muted ml-1">(you)</span>}
                    </p>
                    <p className="text-xs text-text-muted">{member.email}</p>
                    {member.job_title && <p className="text-xs text-text-disabled mt-0.5">{member.job_title}</p>}
                    {member.department && <p className="text-xs text-text-disabled">{member.department}</p>}
                  </div>
                </div>

                {isAdmin && member.id !== currentUser?.id && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                      className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {menuOpen === member.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-8 w-48 bg-bg-elevated border border-surface-border rounded-xl shadow-elevated z-20 py-1 animate-fade-in">
                          {member.is_active ? (
                            <button
                              onClick={() => { deactivateMutation.mutate(member.id); setMenuOpen(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                            >
                              <UserX size={13} /> Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => { activateMutation.mutate(member.id); setMenuOpen(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <UserCheck size={13} /> Activate
                            </button>
                          )}
                          <button
                            onClick={() => { setRoleOpen(member); setNewRole(member.role as UserRole); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                          >
                            <Shield size={13} /> Change Role
                          </button>
                          <button
                            onClick={() => { setTransferOpen(member); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                          >
                            <ArrowRightLeft size={13} /> Transfer Data
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-border">
                <span className={clsx('badge', ROLE_COLORS[member.role] ?? ROLE_COLORS['viewer'])}>
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
                <span className={clsx('badge text-xs',
                  member.is_active
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 border'
                    : 'text-gray-400 bg-gray-500/10 border-gray-500/30 border'
                )}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {member.last_login_at && (
                <p className="text-xs text-text-disabled mt-2">Last seen {timeAgo(member.last_login_at)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Invite Modal ── */}
      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member" size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate(inviteForm);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field" required value={inviteForm.first_name} onChange={e => setInviteForm({...inviteForm, first_name: e.target.value})} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input-field" required value={inviteForm.last_name} onChange={e => setInviteForm({...inviteForm, last_name: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input-field" required value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select className="input-field" value={inviteForm.role} onChange={e => setInviteForm({...inviteForm, role: e.target.value as UserRole})}>
                {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input-field" value={inviteForm.department} onChange={e => setInviteForm({...inviteForm, department: e.target.value})}>
                <option value="">— Unassigned —</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Job Title</label>
            <input className="input-field" placeholder="e.g. Sales Rep, Marketing Head" value={inviteForm.job_title} onChange={e => setInviteForm({...inviteForm, job_title: e.target.value})} />
          </div>
          <div>
            <label className="label">Temporary Password</label>
            <input className="input-field" value={inviteForm.password} onChange={e => setInviteForm({...inviteForm, password: e.target.value})} />
            <p className="text-xs text-text-muted mt-1">User will be prompted to change this on first login.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
            <button type="button" onClick={() => setInviteOpen(false)} className="btn-secondary btn-md">Cancel</button>
            <button type="submit" disabled={inviteMutation.isPending} className="btn-primary btn-md">
              {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Change Role Modal ── */}
      <Modal isOpen={!!roleOpen} onClose={() => setRoleOpen(null)} title="Change User Role" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Select a new role for <strong className="text-text-primary">{roleOpen?.first_name} {roleOpen?.last_name}</strong>.
          </p>
          <select
            className="input-field"
            value={newRole}
            onChange={e => setNewRole(e.target.value as UserRole)}
          >
            {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {/* Role Description */}
          <div className="text-xs text-text-muted bg-bg-elevated rounded-lg p-3 border border-surface-border space-y-1">
            {newRole === 'super_admin' && <p>🔴 <strong>Super Admin</strong> — Full platform access, billing, all data.</p>}
            {newRole === 'admin'       && <p>🟣 <strong>Admin</strong> — Manages users, org settings, all records.</p>}
            {newRole === 'manager'     && <p>🔵 <strong>Manager</strong> — Team data, reports, can reassign leads.</p>}
            {newRole === 'developer'   && <p>🩵 <strong>Developer</strong> — API access, integrations, automation. Cannot manage users.</p>}
            {newRole === 'executive'   && <p>🟢 <strong>Executive</strong> — Access to own assigned records only.</p>}
            {newRole === 'rep'         && <p>🟢 <strong>Rep</strong> — Same as Executive. Legacy role.</p>}
            {newRole === 'viewer'      && <p>⚪ <strong>Read-Only</strong> — View everything, cannot edit.</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
            <button onClick={() => setRoleOpen(null)} className="btn-secondary btn-sm">Cancel</button>
            <button
              onClick={() => {
                if (roleOpen) roleMutation.mutate({ id: roleOpen.id, role: newRole });
                setRoleOpen(null);
              }}
              disabled={roleMutation.isPending || roleOpen?.role === newRole}
              className="btn-primary btn-sm"
            >
              {roleMutation.isPending ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Transfer Data Modal ── */}
      <Modal isOpen={!!transferOpen} onClose={() => setTransferOpen(null)} title="Transfer Data" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Transfer all contacts and deals from <strong className="text-text-primary">{transferOpen?.first_name}</strong> to:
          </p>
          <select className="input-field" value={transferTo} onChange={e => setTransferTo(e.target.value)}>
            <option value="">Select target user</option>
            {users?.filter(u => u.id !== transferOpen?.id && u.is_active).map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {ROLE_LABELS[u.role] ?? u.role}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-border">
            <button onClick={() => setTransferOpen(null)} className="btn-secondary btn-md">Cancel</button>
            <button
              disabled={!transferTo || transferMutation.isPending}
              onClick={() => transferMutation.mutate({ fromId: transferOpen!.id, toId: transferTo })}
              className="btn-danger btn-md"
            >
              {transferMutation.isPending ? 'Transferring...' : 'Transfer Data'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
