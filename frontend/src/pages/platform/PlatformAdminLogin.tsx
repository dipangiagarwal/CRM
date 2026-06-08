import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound, Loader2 } from 'lucide-react';
import { platformApi } from '../../api/platform';
import { useUIStore } from '../../store/uiStore';

export const PlatformAdminLogin: React.FC = () => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  useEffect(() => {
    // If already logged in, redirect
    if (localStorage.getItem('platform_admin_key')) {
      navigate('/platform-admin');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key) return;

    setLoading(true);
    try {
      // Temporarily save to test
      localStorage.setItem('platform_admin_key', key);
      
      // Ping stats to verify key
      await platformApi.stats();
      
      addToast({ type: 'success', title: 'Platform Admin Authenticated' });
      navigate('/platform-admin');
    } catch (err) {
      localStorage.removeItem('platform_admin_key');
      addToast({ type: 'error', title: 'Invalid Platform Key' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-glow-sm shadow-red-500">
            <Shield size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Platform Admin</h1>
          <p className="text-text-muted mt-2">Restricted Area. Authorized personnel only.</p>
        </div>

        <div className="card p-8 shadow-elevated">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Admin Secret Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound size={16} className="text-text-muted" />
                </div>
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter X-Platform-Key"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !key}
              className="w-full btn-primary bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-glow-sm shadow-red-500/30"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Authenticate'}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <a href="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Return to User Login
          </a>
        </div>
      </div>
    </div>
  );
};
