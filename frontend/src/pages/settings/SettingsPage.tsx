import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save, Loader2, Shield, User, Building, Lock } from 'lucide-react';
import { usersApi } from '../../api/users';
import { organizationsApi } from '../../api/organizations';
import { authApi } from '../../api/auth';
import { Avatar } from '../../components/ui/Avatar';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { ROLE_LABELS, getFileUrl } from '../../utils/helpers';
import { clsx } from 'clsx';

const TABS = [
  { id: 'profile', label: 'My Profile', icon: User, description: 'Manage your personal details and job title.' },
  { id: 'organization', label: 'Workspace Setting', icon: Building, description: 'Customize organization name, logo, and plan.', adminOnly: true },
  { id: 'security', label: 'Security & Sign In', icon: Lock, description: 'Keep your login credentials secure.' },
];

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user: currentUser, setAuth, setOrg } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    first_name: currentUser?.first_name ?? '',
    last_name: currentUser?.last_name ?? '',
    job_title: currentUser?.job_title ?? '',
  });

  // Password form
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwError, setPwError] = useState('');

  const { data: org } = useQuery({
    queryKey: ['org'],
    queryFn: organizationsApi.me,
  });

  const [orgName, setOrgName] = useState('');
  React.useEffect(() => { if (org?.name) setOrgName(org.name); }, [org]);

  const updateProfileMutation = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: (user) => {
      setAuth(user);
      addToast({ type: 'success', title: 'Profile updated' });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update profile' }),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: usersApi.uploadAvatar,
    onSuccess: (user) => {
      setAuth(user);
      addToast({ type: 'success', title: 'Avatar updated' });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to upload avatar' }),
  });

  const updateOrgMutation = useMutation({
    mutationFn: async () => {
      await organizationsApi.update(orgName);
      return organizationsApi.me();
    },
    onSuccess: (updatedOrg) => {
      setOrg(updatedOrg);
      addToast({ type: 'success', title: 'Workspace settings updated' });
      queryClient.invalidateQueries({ queryKey: ['org'] });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update organization' }),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      await organizationsApi.uploadLogo(file);
      return organizationsApi.me();
    },
    onSuccess: (updatedOrg) => {
      setOrg(updatedOrg);
      addToast({ type: 'success', title: 'Company logo updated' });
      queryClient.invalidateQueries({ queryKey: ['org'] });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to upload logo' }),
  });

  const changePwMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => { 
      addToast({ type: 'success', title: 'Password changed successfully' }); 
      setPwForm({ old_password: '', new_password: '', confirm: '' }); 
    },
    onError: (err: any) => setPwError(err?.response?.data?.detail ?? 'Failed to change password'),
  });

  const handleChangePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    if (pwForm.new_password.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwError('');
    changePwMutation.mutate({ old_password: pwForm.old_password, new_password: pwForm.new_password });
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">Settings</h1>
        <p className="text-text-muted mt-0.5 text-xs font-medium">Manage your personal profiles, preferences, and organization settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side: Category Menu */}
        <div className="space-y-1.5 md:col-span-1">
          {TABS.filter(t => !t.adminOnly || isAdmin).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all border text-left group",
                  isActive 
                    ? "bg-primary-500/10 border-primary-500/20 text-primary-400 font-bold" 
                    : "bg-transparent border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                )}
              >
                <Icon size={16} className={clsx("shrink-0 mt-0.5", isActive ? "text-primary-400" : "text-text-muted group-hover:text-text-primary")} />
                <div>
                  <p className="text-xs font-semibold leading-tight">{tab.label}</p>
                  <p className="text-[10px] text-text-muted mt-0.5 leading-normal hidden md:block">{tab.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab View */}
        <div className="md:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-6">
              {/* Profile Details Header */}
              <div className="flex items-center gap-4 pb-6 border-b border-surface-border">
                <div className="relative group">
                  <Avatar firstName={currentUser?.first_name ?? ''} lastName={currentUser?.last_name} avatarUrl={currentUser?.avatar_url} size="lg" className="shadow border border-surface-border/50" />
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-primary-500 hover:bg-primary-600 flex items-center justify-center border-2 border-bg-card cursor-pointer transition-colors shadow">
                    {uploadAvatarMutation.isPending ? (
                      <Loader2 size={12} className="text-white animate-spin" />
                    ) : (
                      <Camera size={12} className="text-white" />
                    )}
                    <input type="file" className="hidden" accept="image/*" disabled={uploadAvatarMutation.isPending} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatarMutation.mutate(f); }} />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{currentUser?.first_name} {currentUser?.last_name}</p>
                  <p className="text-xs text-text-muted mt-0.5 font-medium">{currentUser?.email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-[9px] font-extrabold text-primary-400 bg-primary-500/10 rounded border border-primary-500/10 uppercase tracking-wider">
                    {ROLE_LABELS[currentUser?.role as string] ?? currentUser?.role}
                  </span>
                </div>
              </div>

              {/* Form details */}
              <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name *</label>
                    <input className="input-field" value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input className="input-field" value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="label">Job Title</label>
                  <input className="input-field" placeholder="e.g. Senior Account Executive" value={profileForm.job_title} onChange={e => setProfileForm({...profileForm, job_title: e.target.value})} />
                </div>
                <div>
                  <label className="label">Email Address (Read-only)</label>
                  <input className="input-field opacity-60 cursor-not-allowed bg-bg bg-opacity-70" value={currentUser?.email} disabled />
                  <p className="text-[10px] text-text-muted mt-1.5 font-medium">To modify account emails, please contact workspace administrators.</p>
                </div>
                <div className="flex justify-end pt-3">
                  <button type="submit" disabled={updateProfileMutation.isPending} className="btn-primary btn-sm flex items-center gap-1.5">
                    {updateProfileMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && isAdmin && (
            <div className="card p-6 space-y-6">
              {/* Logo Manager */}
              <div className="flex items-center gap-4 pb-6 border-b border-surface-border">
                <div className="w-16 h-16 rounded-2xl bg-bg border border-surface-border flex items-center justify-center text-xl font-bold text-primary-400 overflow-hidden shrink-0">
                  {org?.logo_url ? <img src={getFileUrl(org.logo_url)} className="w-full h-full object-cover" alt="logo" /> : org?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary">Workspace Logo</p>
                  <p className="text-[10px] text-text-muted font-medium mb-2.5">Upload a clean PNG, JPG, or WebP logo file (Max 2MB).</p>
                  <label className="btn-secondary btn-sm cursor-pointer select-none">
                    {uploadLogoMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Upload Logo"}
                    <input type="file" className="hidden" accept="image/*" disabled={uploadLogoMutation.isPending} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogoMutation.mutate(f); }} />
                  </label>
                </div>
              </div>

              {/* Company Info Form */}
              <div className="space-y-4">
                <div>
                  <label className="label">Organization Name *</label>
                  <input className="input-field" value={orgName} onChange={e => setOrgName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Current Subscription Plan</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge text-[10px] py-0 px-2.5 text-primary-400 bg-primary-500/10 border border-primary-500/20 uppercase font-bold tracking-wider">{org?.plan ?? 'Starter'}</span>
                    <span className={clsx(
                      'badge text-[10px] py-0 px-2.5 border uppercase font-bold tracking-wider', 
                      org?.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                    )}>
                      {org?.status ?? 'Active'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end pt-3">
                  <button onClick={() => updateOrgMutation.mutate()} disabled={updateOrgMutation.isPending} className="btn-primary btn-sm flex items-center gap-1.5">
                    {updateOrgMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card p-6 space-y-4">
              <div className="pb-4 border-b border-surface-border flex items-center gap-2">
                <Shield size={16} className="text-primary-400" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Change Password</h3>
              </div>
              <form onSubmit={handleChangePw} className="space-y-4">
                <div>
                  <label className="label">Current Password *</label>
                  <input type="password" className="input-field" value={pwForm.old_password} onChange={e => { setPwForm({...pwForm, old_password: e.target.value}); setPwError(''); }} required />
                </div>
                <div>
                  <label className="label">New Password *</label>
                  <input type="password" className="input-field" value={pwForm.new_password} onChange={e => { setPwForm({...pwForm, new_password: e.target.value}); setPwError(''); }} required />
                </div>
                <div>
                  <label className="label">Confirm New Password *</label>
                  <input type="password" className="input-field" value={pwForm.confirm} onChange={e => { setPwForm({...pwForm, confirm: e.target.value}); setPwError(''); }} required />
                  {pwError && <p className="text-xs text-red-400 mt-2 font-medium">{pwError}</p>}
                </div>
                <div className="flex justify-end pt-3">
                  <button type="submit" disabled={changePwMutation.isPending} className="btn-primary btn-sm flex items-center gap-1.5">
                    {changePwMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
