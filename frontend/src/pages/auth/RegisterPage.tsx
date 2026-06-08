import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const schema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  company_slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const autoSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.register(data);
      const user = await usersApi.me();
      setAuth(user);
      navigate('/change-password');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Registration Failed',
        message: err?.response?.data?.detail ?? 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-glow">
            <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-text-primary">Pixel CRM</span>
        </div>

        <div className="card p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text-primary">Create your workspace</h1>
            <p className="text-text-muted mt-1">Get started free. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Company Details */}
            <div className="grid grid-cols-1 gap-4 pb-2 border-b border-surface-border mb-1">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Company Details</p>
              <div>
                <label className="label">Company Name</label>
                <input
                  className="input-field"
                  placeholder="Acme Corp"
                  {...register('company_name', {
                    onChange: (e) => setValue('company_slug', autoSlug(e.target.value))
                  })}
                />
                {errors.company_name && <p className="text-xs text-red-400 mt-1">{errors.company_name.message}</p>}
              </div>
              <div>
                <label className="label">Company URL</label>
                <div className="flex items-center gap-0">
                  <span className="px-3 py-2 text-sm bg-bg border border-r-0 border-surface-border rounded-l-lg text-text-muted">crm/</span>
                  <input
                    className="input-field rounded-l-none"
                    placeholder="acme-corp"
                    {...register('company_slug')}
                  />
                </div>
                {errors.company_slug && <p className="text-xs text-red-400 mt-1">{errors.company_slug.message}</p>}
              </div>
            </div>

            {/* Admin User */}
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Admin User</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input className="input-field" placeholder="Jane" {...register('first_name')} />
                {errors.first_name && <p className="text-xs text-red-400 mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input-field" placeholder="Doe" {...register('last_name')} />
                {errors.last_name && <p className="text-xs text-red-400 mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Work Email</label>
              <input type="email" className="input-field" placeholder="jane@acme.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min. 8 characters"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-md w-full mt-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Creating workspace...' : 'Create free workspace'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
