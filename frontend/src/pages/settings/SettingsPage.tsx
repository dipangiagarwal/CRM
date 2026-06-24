import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save, Loader2, Shield } from 'lucide-react';
import { usersApi } from '../../api/users';
import { organizationsApi } from '../../api/organizations';
import { authApi } from '../../api/auth';
import { Avatar } from '../../components/ui/Avatar';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { capitalize, ROLE_LABELS } from '../../utils/helpers';

const TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'organization', label: 'Organization', icon: '🏢' },
  { id: 'security', label: 'Security', icon: '🔒' },
];

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user: currentUser, setAuth } = useAuthStore();
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
      addToast({ type: 'success', title: 'Profile updated!' });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update profile' }),
  });

  const updateOrgMutation = useMutation({
    mutationFn: () => organizationsApi.update(orgName),
    onSuccess: () => { addToast({ type: 'success', title: 'Organization updated!' }); queryClient.invalidateQueries({ queryKey: ['org'] }); },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: organizationsApi.uploadLogo,
    onSuccess: () => { addToast({ type: 'success', title: 'Logo updated!' }); queryClient.invalidateQueries({ queryKey: ['org'] }); },
  });

  const changePwMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => { addToast({ type: 'success', title: 'Password changed!' }); setPwForm({ old_password: '', new_password: '', confirm: '' }); },
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
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-muted mt-1 text-sm">Manage your profile and workspace settings</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-elevated border border-surface-border w-fit">
        {TABS.filter(t => t.id !== 'organization' || isAdmin).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
              ${activeTab === tab.id ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar firstName={currentUser?.first_name ?? ''} lastName={currentUser?.last_name} size="lg" />
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center shadow border-2 border-bg-card">
                <Camera size={12} className="text-white" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-text-primary">{currentUser?.first_name} {currentUser?.last_name}</p>
              <p className="text-sm text-text-muted">{currentUser?.email}</p>
              <p className="text-xs text-primary-400 mt-1 font-medium">{ROLE_LABELS[currentUser?.role as string] ?? currentUser?.role}</p>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input className="input-field" value={profileForm.first_name} onChange={e => setProfileForm({...profileForm, first_name: e.target.value})} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input-field" value={profileForm.last_name} onChange={e => setProfileForm({...profileForm, last_name: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label">Job Title</label>
              <input className="input-field" placeholder="e.g. Sales Manager" value={profileForm.job_title} onChange={e => setProfileForm({...profileForm, job_title: e.target.value})} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field opacity-50 cursor-not-allowed" value={currentUser?.email} disabled />
              <p className="text-xs text-text-muted mt-1">Email cannot be changed. Contact support.</p>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={updateProfileMutation.isPending} className="btn-primary btn-md">
                {updateProfileMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && isAdmin && (
        <div className="card p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-text-primary mb-4">Company Settings</h3>

            {/* Logo */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-border">
              <div className="w-16 h-16 rounded-xl bg-bg-elevated border border-surface-border flex items-center justify-center text-2xl font-bold text-primary-400">
                {org?.logo_url ? <img src={org.logo_url} className="w-full h-full object-cover rounded-xl" alt="logo" /> : org?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Company Logo</p>
                <p className="text-xs text-text-muted mb-2">PNG, JPG, WebP. Max 2MB.</p>
                <label className="btn-secondary btn-sm cursor-pointer">
                  Upload Logo
                  <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogoMutation.mutate(f); }} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Company Name</label>
                <input className="input-field" value={orgName} onChange={e => setOrgName(e.target.value)} />
              </div>
              <div>
                <label className="label">Plan</label>
                <div className="flex items-center gap-2">
                  <span className="badge text-primary-400 bg-primary-500/10 border border-primary-500/30">{capitalize(org?.plan ?? '')}</span>
                  <span className={`badge ${org?.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 border' : 'text-red-400 bg-red-500/10 border-red-500/30 border'}`}>
                    {capitalize(org?.status ?? '')}
                  </span>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => updateOrgMutation.mutate()} disabled={updateOrgMutation.isPending} className="btn-primary btn-md">
                  {updateOrgMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card p-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Shield size={16} className="text-primary-400" /> Change Password
          </h3>
          <form onSubmit={handleChangePw} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input-field" value={pwForm.old_password} onChange={e => { setPwForm({...pwForm, old_password: e.target.value}); setPwError(''); }} />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input-field" value={pwForm.new_password} onChange={e => { setPwForm({...pwForm, new_password: e.target.value}); setPwError(''); }} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input-field" value={pwForm.confirm} onChange={e => { setPwForm({...pwForm, confirm: e.target.value}); setPwError(''); }} />
              {pwError && <p className="text-xs text-red-400 mt-1">{pwError}</p>}
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={changePwMutation.isPending} className="btn-primary btn-md">
                {changePwMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Change Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
