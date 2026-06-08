import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import { usersApi } from '../../api/users';
import { organizationsApi } from '../../api/organizations';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, setOrg } = useAuthStore();
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const response = await authApi.login(data);

      // Fetch full user profile
      const user = await usersApi.me();
      setAuth(user);

      // Grace warning
      if (response.grace_warning) {
        addToast({ type: 'warning', title: 'Subscription Warning', message: response.grace_warning });
      }

      // Force password change on first login
      if (!response.tour_completed) {
        navigate('/change-password');
        return;
      }

      // Fetch org
      try {
        const org = await organizationsApi.me();
        setOrg(org);
        if (!response.onboarding_completed) {
          navigate('/onboarding');
          return;
        }
      } catch {}

      navigate('/dashboard');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Login Failed',
        message: err?.response?.data?.detail ?? 'Invalid email or password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-bg-card border-r border-surface-border flex-col p-12">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-text-primary">Pixel CRM</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Manage your sales pipeline <span className="text-gradient">like a pro</span>
          </h1>
          <p className="text-lg text-text-muted mb-10 leading-relaxed">
            Track contacts, close deals, and grow revenue — all in one beautiful workspace.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🎯', title: 'Unified Pipeline', desc: 'Kanban boards, deal tracking, and forecasting' },
              { icon: '📊', title: 'Real-time Analytics', desc: 'Revenue trends, win rates, activity reports' },
              { icon: '⚡', title: 'Team Collaboration', desc: 'Multi-user with roles, real-time updates' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl bg-bg-elevated border border-surface-border">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-text-primary text-sm">{f.title}</p>
                  <p className="text-xs text-text-muted">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-text-primary">Pixel CRM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
            <p className="text-text-muted mt-1.5">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@company.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-md w-full"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
