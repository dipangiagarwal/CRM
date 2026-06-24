import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserCheck, Loader2, ShieldAlert } from 'lucide-react';
import { contactsApi } from '../../api/contacts';
import { usersApi } from '../../api/users';
import { Avatar } from '../../components/ui/Avatar';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/helpers';
import { clsx } from 'clsx';

export const AssignLeadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.get(id!),
    enabled: !!id,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: usersApi.listAll,
  });

  const assignMutation = useMutation({
    mutationFn: (ownerId: string) => contactsApi.assign(id!, ownerId),
    onSuccess: (res: any) => {
      addToast({
        type: 'success',
        title: `Lead assigned successfully`,
        description: `Owner set to ${res.new_owner}`
      });
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      navigate(`/contacts/${id}`);
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Assignment failed',
        description: err?.response?.data?.detail ?? 'Failed to reassign contact'
      });
    },
  });

  if (contactLoading || usersLoading) {
    return <PageLoader />;
  }

  if (!contact) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto mt-10">
        <ShieldAlert className="mx-auto text-red-500 mb-4" size={40} />
        <h2 className="text-xl font-bold text-text-primary">Contact Not Found</h2>
        <p className="text-text-muted mt-2">The contact you are trying to assign does not exist or you do not have permission to view it.</p>
        <button onClick={() => navigate('/contacts')} className="btn-primary btn-md mt-6">
          Back to Contacts
        </button>
      </div>
    );
  }

  const activeUsers = (users ?? []).filter(u => u.is_active);
  const currentOwner = activeUsers.find(u => u.id === contact.owner_id);

  // Filter users based on search term (name, email, department)
  const filteredUsers = activeUsers.filter(u => {
    const term = searchTerm.toLowerCase();
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const email = u.email.toLowerCase();
    const dept = (u.department ?? '').toLowerCase();
    const job = (u.job_title ?? '').toLowerCase();
    return fullName.includes(term) || email.includes(term) || dept.includes(term) || job.includes(term);
  });

  const canReassign =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'manager';

  const handleAssign = (userId: string) => {
    if (!canReassign) return;
    assignMutation.mutate(userId);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/contacts/${id}`)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to Contact Details
        </button>
        <h1 className="text-2xl font-bold text-text-primary">Assign Lead</h1>
        <p className="text-text-muted text-sm mt-1">Assign contact to a team member to manage ownership and notifications.</p>
      </div>

      {/* Warning if user does not have permission */}
      {!canReassign && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Permission Restricted</p>
            <p className="text-red-400/80 mt-0.5">Only Super Admins, Admins, and Managers have permission to reassign contact ownership.</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <div className="md:col-span-1 space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Target Lead</h3>
            <div className="flex flex-col items-center text-center p-4 bg-bg-elevated rounded-xl border border-surface-border">
              <Avatar firstName={contact.first_name} lastName={contact.last_name} size="lg" />
              <h2 className="text-lg font-bold text-text-primary mt-3">
                {contact.first_name} {contact.last_name}
              </h2>
              {contact.company_name && (
                <p className="text-sm text-text-muted mt-1">{contact.company_name}</p>
              )}
              {contact.email && (
                <p className="text-xs text-text-muted mt-0.5 truncate max-w-full">{contact.email}</p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <p className="text-xs text-text-muted">Current Owner</p>
                {currentOwner ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-[10px] font-bold">
                      {currentOwner.first_name[0]}{currentOwner.last_name?.[0] || ''}
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {currentOwner.first_name} {currentOwner.last_name}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-text-disabled mt-1 italic">No owner assigned</p>
                )}
              </div>
              <div>
                <p className="text-xs text-text-muted">Lifecycle Stage</p>
                <span className="badge mt-1 bg-primary-500/10 text-primary-400 border border-primary-500/20 capitalize">
                  {contact.lifecycle_stage}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Selection Card */}
        <div className="md:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-text-primary text-base">Select Assignee</h3>
              <span className="text-xs text-text-muted">
                {filteredUsers.length} active team members
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
              <input
                type="text"
                placeholder="Search by name, email, department, job title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-bg-elevated border border-surface-border rounded-lg text-text-primary outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>

            {/* Users list */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">No team members match your search.</p>
              ) : (
                filteredUsers.map(user => {
                  const isCurrent = user.id === contact.owner_id;
                  const isPending = assignMutation.isPending && assignMutation.variables === user.id;

                  return (
                    <div
                      key={user.id}
                      className={clsx(
                        "p-3 rounded-xl border flex items-center justify-between transition-all",
                        isCurrent
                          ? "bg-primary-500/5 border-primary-500/30"
                          : "bg-bg-card hover:bg-bg-hover/50 border-surface-border hover:border-surface-muted"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar firstName={user.first_name} lastName={user.last_name} avatarUrl={user.avatar_url} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-muted flex-wrap">
                            <span className={clsx("badge py-0 px-1.5 text-[10px]", ROLE_COLORS[user.role] ?? ROLE_COLORS['viewer'])}>
                              {ROLE_LABELS[user.role] ?? user.role}
                            </span>
                            {user.department && (
                              <span className="text-text-muted/60">• {user.department}</span>
                            )}
                            {user.job_title && (
                              <span className="text-text-muted/60">• {user.job_title}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Select/Assign Button */}
                      <div>
                        {isCurrent ? (
                          <span className="text-xs text-primary-400 font-semibold flex items-center gap-1 bg-primary-500/10 px-2.5 py-1 rounded-lg border border-primary-500/20">
                            <UserCheck size={12} />
                            Owner
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAssign(user.id)}
                            disabled={!canReassign || assignMutation.isPending}
                            className={clsx(
                              "btn btn-sm transition-all",
                              canReassign
                                ? "btn-secondary text-primary-400 border-primary-500/20 hover:bg-primary-500/10 hover:text-primary-300"
                                : "btn-secondary opacity-40 cursor-not-allowed"
                            )}
                          >
                            {isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              'Assign'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
