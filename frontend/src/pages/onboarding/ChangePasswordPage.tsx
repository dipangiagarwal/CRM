import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const { addToast } = useUIStore();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authApi.changePassword({ old_password: oldPw, new_password: newPw });
      // Update user in store
      if (user) {
        setAuth({ ...user, tour_completed: true });
      }
      addToast({ type: 'success', title: 'Password Updated!', message: 'You can now access your workspace.' });
      navigate('/onboarding');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
              <ShieldCheck size={28} className="text-primary-400" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary">Set your password</h1>
            <p className="text-text-muted mt-2 text-sm">
              Welcome, <strong className="text-text-secondary">{user?.first_name}</strong>! Please set a new password for your account before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Current (temporary) Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Temporary password"
                  value={oldPw}
                  onChange={(e) => { setOldPw(e.target.value); setError(''); }}
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Min. 8 characters"
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setError(''); }}
              />
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Repeat new password"
                value={confirmPw}
                onChange={(e) => { setConfirmPw(e.target.value); setError(''); }}
              />
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-md w-full mt-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Saving...' : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
