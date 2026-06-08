import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Building2, LogOut, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '../../store/uiStore';

const NAVIGATION = [
  { name: 'Dashboard', to: '/platform-admin', icon: LayoutDashboard },
  { name: 'Organizations', to: '/platform-admin/organizations', icon: Building2 },
];

export const PlatformAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useUIStore();

  useEffect(() => {
    // Check authentication
    const key = localStorage.getItem('platform_admin_key');
    if (!key) {
      navigate('/platform-admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('platform_admin_key');
    addToast({ type: 'success', title: 'Logged out of Platform Admin' });
    navigate('/platform-admin/login');
  };

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-elevated border-r border-surface-border flex flex-col h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-surface-border">
          <div className="flex items-center gap-2 text-red-500 font-bold text-xl">
            <Shield size={24} />
            Platform Admin
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAVIGATION.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.to}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red-500/10 text-red-500'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                )}
              >
                <Icon size={18} className={clsx(isActive ? 'text-red-500' : 'text-text-muted')} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-surface-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} className="text-text-muted" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="h-16 border-b border-surface-border bg-bg-base/80 backdrop-blur-md sticky top-0 z-10 flex items-center px-8">
          <h2 className="text-sm font-medium text-text-muted">
            {NAVIGATION.find(n => n.to === location.pathname)?.name || 'Platform Administration'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
