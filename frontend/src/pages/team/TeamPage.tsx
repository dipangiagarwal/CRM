import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreHorizontal, UserCheck, UserX, ArrowRightLeft, Upload, Shield } from 'lucide-react';
import { usersApi } from '../../api/users';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { timeAgo, ROLE_COLORS, capitalize } from '../../utils/helpers';
import { clsx } from 'clsx';
import type { User, UserRole } from '../../types';

const ROLES: UserRole[] = ['admin', 'manager', 'rep', 'viewer'];

export const TeamPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState<User | null>(null);
  const [transferTo, setTransferTo] = useState('');
  const [roleOpen, setRoleOpen] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('viewer');

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    first_name: '', last_name: '', email: '', role: 'rep' as UserRole,
    job_title: '', password: 'Welcome@1234',
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

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Team</h1>
          <p className="text-text-muted mt-1 text-sm">{users?.length ?? 0} members in your workspace</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
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
          </div>
        )}
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <PageLoader />
      ) : users?.length === 0 ? (
        <EmptyState title="No team members" description="Invite your first team member to get started." />
      ) : (
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
                <span className={clsx('badge', ROLE_COLORS[member.role])}>{capitalize(member.role)}</span>
                <div className="flex items-center gap-2">
                  <span className={clsx('badge text-xs', member.is_active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 border' : 'text-gray-400 bg-gray-500/10 border-gray-500/30 border')}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {member.last_login_at && (
                <p className="text-xs text-text-disabled mt-2">Last seen {timeAgo(member.last_login_at)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
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
                {ROLES.map(r => <option key={r} value={r}>{capitalize(r)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Job Title</label>
              <input className="input-field" placeholder="Sales Rep" value={inviteForm.job_title} onChange={e => setInviteForm({...inviteForm, job_title: e.target.value})} />
            </div>
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

      {/* Change Role Modal */}
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
            {ROLES.map(r => <option key={r} value={r}>{capitalize(r)}</option>)}
          </select>
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

      {/* Transfer Data Modal */}
      <Modal isOpen={!!transferOpen} onClose={() => setTransferOpen(null)} title="Transfer Data" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Transfer all contacts and deals from <strong className="text-text-primary">{transferOpen?.first_name}</strong> to:
          </p>
          <select className="input-field" value={transferTo} onChange={e => setTransferTo(e.target.value)}>
            <option value="">Select target user</option>
            {users?.filter(u => u.id !== transferOpen?.id && u.is_active).map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
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
