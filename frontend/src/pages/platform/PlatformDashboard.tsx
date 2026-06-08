import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../../api/platform';
import { Building2, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PageLoader } from '../../components/ui/LoadingSpinner';

export const PlatformDashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform', 'stats'],
    queryFn: platformApi.stats,
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Platform Dashboard</h1>
        <p className="text-text-muted mt-1 text-sm">Overview of all organizations and users across the CRM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Total Organizations</p>
              <h3 className="text-3xl font-bold text-text-primary mt-2">{stats?.total_organizations ?? 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Building2 size={24} className="text-primary-400" />
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Active Organizations</p>
              <h3 className="text-3xl font-bold text-text-primary mt-2">{stats?.active_organizations ?? 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Suspended Orgs</p>
              <h3 className="text-3xl font-bold text-text-primary mt-2">{stats?.suspended_organizations ?? 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-400" />
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Total Users</p>
              <h3 className="text-3xl font-bold text-text-primary mt-2">{stats?.total_users ?? 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users size={24} className="text-blue-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
