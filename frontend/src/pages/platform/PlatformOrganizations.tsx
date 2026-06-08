import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/platform';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatDate, capitalize } from '../../utils/helpers';
import { clsx } from 'clsx';
import { Eye } from 'lucide-react';

export const PlatformOrganizations: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'organizations'],
    queryFn: platformApi.organizations,
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Organizations</h1>
        <p className="text-text-muted mt-1 text-sm">{data?.total ?? 0} organizations registered.</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-elevated border-b border-surface-border text-xs font-semibold text-text-muted uppercase tracking-wider">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Users</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {data?.organizations.map((org: any) => (
              <tr key={org.id} className="hover:bg-bg-hover transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-text-primary">{org.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{org.slug}</p>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-text-secondary">
                  {capitalize(org.plan)}
                </td>
                <td className="px-6 py-4">
                  <span className={clsx('badge', {
                    'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30': org.status === 'active',
                    'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30': org.status === 'grace',
                    'text-red-400 bg-red-500/10 border border-red-500/30': org.status === 'suspended',
                  })}>
                    {capitalize(org.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {org.active_users} / {org.max_users}
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">
                  {formatDate(org.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => navigate(`/platform-admin/organizations/${org.id}`)}
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors inline-flex"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {data?.organizations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-text-muted">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
