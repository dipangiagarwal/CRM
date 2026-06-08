import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-glow">
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-text-primary">Pixel CRM</span>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
              <p className="text-text-muted text-sm mb-6">
                If <strong className="text-text-secondary">{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" className="btn-secondary btn-md inline-flex">
                <ArrowLeft size={14} />
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Reset your password</h2>
                <p className="text-text-muted mt-1 text-sm">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
                    <input
                      type="email"
                      className="input-field pl-9"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    />
                  </div>
                  {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary btn-md w-full">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm text-text-muted hover:text-text-primary flex items-center justify-center gap-1 transition-colors">
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
