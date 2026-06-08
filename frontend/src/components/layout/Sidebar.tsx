import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Activity,
  BarChart3,
  UserCog,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { authApi } from '../../api/auth';
import { getInitials } from '../../utils/helpers';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/deals', icon: Briefcase, label: 'Pipeline' },
  { to: '/activities', icon: Activity, label: 'Activities' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

const BOTTOM_NAV = [
  { to: '/team', icon: UserCog, label: 'Team', adminOnly: true },
  { to: '/billing', icon: CreditCard, label: 'Billing', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC = () => {
  const { user, org, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-bg-card border-r border-surface-border transition-all duration-300 ease-in-out shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-surface-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-glow">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary leading-tight">Pixel CRM</p>
              <p className="text-xs text-text-muted leading-tight truncate max-w-[100px]">{org?.name || '...'}</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center mx-auto shadow-glow">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-primary-400 bg-primary-500/10 border border-primary-500/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover border border-transparent',
                sidebarCollapsed && 'justify-center px-2'
              )
            }
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="px-2 pb-2 space-y-1 border-t border-surface-border pt-2">
        {BOTTOM_NAV.filter((item) => !item.adminOnly || isAdmin).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-primary-400 bg-primary-500/10 border border-primary-500/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover border border-transparent',
                sidebarCollapsed && 'justify-center px-2'
              )
            }
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* Collapse toggle (when collapsed) */}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="border-t border-surface-border p-3">
        <div
          className={clsx(
            'flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors cursor-pointer group',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xs font-bold text-primary-400 shrink-0">
            {getInitials(user?.first_name ?? '', user?.last_name)}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-text-muted truncate">{user?.role}</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-red-400 transition-all"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
