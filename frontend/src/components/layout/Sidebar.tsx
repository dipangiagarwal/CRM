import React, { useState } from 'react';
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
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { authApi } from '../../api/auth';
import { ROLE_LABELS } from '../../utils/helpers';
import { Avatar } from '../ui/Avatar';
import { clsx } from 'clsx';

const NAVIGATION_GROUPS = [
  {
    title: 'Workspace',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/contacts',  icon: Users,           label: 'Leads' },
      { to: '/tasks',     icon: UserCheck,       label: 'Tasks' },
      { to: '/deals',     icon: Briefcase,        label: 'Pipeline' },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { to: '/activities',icon: Activity,         label: 'Activities' },
      { to: '/reports',   icon: BarChart3,        label: 'Reports' },
    ]
  },
  {
    title: 'System',
    items: [
      { to: '/team',     icon: UserCog,    label: 'Team',    adminOnly: true },
      { to: '/billing',  icon: CreditCard, label: 'Billing', adminOnly: true },
      { to: '/settings', icon: Settings,   label: 'Settings' },
    ]
  }
];

export const Sidebar: React.FC = () => {
  const { user, org, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  // Tracks whether the sidebar is temporarily expanded due to hover
  const [hoverExpanded, setHoverExpanded] = useState(false);

  // The sidebar is visually open if either permanently open OR hover-expanded
  const isOpen = !sidebarCollapsed || hoverExpanded;

  const handleMouseEnter = () => {
    if (sidebarCollapsed) setHoverExpanded(true);
  };

  const handleMouseLeave = () => {
    setHoverExpanded(false);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div
      className={clsx(
        'transition-all duration-300 ease-in-out shrink-0 relative z-30 h-screen',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={clsx(
          'flex flex-col h-screen bg-bg-card border-r border-surface-border transition-all duration-300 ease-in-out absolute left-0 top-0',
          isOpen ? 'w-60 shadow-lg' : 'w-16'
        )}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-border h-14 shrink-0">
          {isOpen ? (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center shadow-glow shrink-0 transition-transform hover:rotate-6">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-primary leading-tight">Pixel CRM</p>
                <p className="text-[10px] text-text-muted leading-tight truncate font-semibold">{org?.name || 'Org Workspace'}</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center mx-auto shadow-glow transition-transform hover:scale-105">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          )}

          {/* Collapse toggle (only shows when pinned open) */}
          {isOpen && !hoverExpanded && (
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors border border-transparent hover:border-surface-border"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto select-none">
          {NAVIGATION_GROUPS.map((group) => {
            // Filter items based on admin check
            const items = group.items.filter(item => !item.adminOnly || isAdmin);
            if (items.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {isOpen && (
                  <p className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    {group.title}
                  </p>
                )}
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 relative group',
                        isActive
                          ? 'nav-item-active'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent',
                        !isOpen && 'justify-center px-2'
                      )
                    }
                    title={!isOpen ? label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                    {isOpen && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Collapse Toggle when Pinned Closed */}
        {!isOpen && (
          <div className="px-3 py-2 border-t border-surface-border">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-hover border border-transparent hover:border-surface-border transition-all"
              title="Pin sidebar open"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* User Profile */}
        <div className="border-t border-surface-border p-3 shrink-0">
          <div
            className={clsx(
              'flex items-center gap-3 p-2 rounded-xl hover:bg-bg-hover/80 border border-transparent hover:border-surface-border transition-all cursor-pointer group',
              !isOpen && 'justify-center'
            )}
          >
            <Avatar firstName={user?.first_name ?? ''} lastName={user?.last_name} avatarUrl={user?.avatar_url} size="sm" className="w-8 h-8 rounded-lg shadow-sm border border-surface-border/50" />
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[10px] text-text-muted truncate uppercase tracking-wider font-semibold">
                  {ROLE_LABELS[user?.role as string] ?? user?.role}
                </p>
              </div>
            )}
            {isOpen && (
              <button
                onClick={handleLogout}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
