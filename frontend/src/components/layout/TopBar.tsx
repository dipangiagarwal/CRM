import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Search, ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { activitiesApi } from '../../api/activities';
import { getInitials, ROLE_LABELS, timeAgo, ACTIVITY_ICONS, ACTIVITY_COLORS } from '../../utils/helpers';
import { ThemeToggle } from '../../components/ThemeToggle';
import { clsx } from 'clsx';

export const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [lastChecked, setLastChecked] = useState<string>(() => {
    return localStorage.getItem('lastCheckedNotifications') || new Date(0).toISOString();
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['activities', 'recent-notifications'],
    queryFn: () => activitiesApi.list({ limit: 10 }),
    refetchInterval: 15_000, // poll every 15s to get live updates
  });

  const activities = activitiesData?.activities ?? [];

  const unreadCount = activities.filter(act => {
    if (!act.created_at) return false;
    return new Date(act.created_at) > new Date(lastChecked);
  }).length;

  const handleOpenNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    setDropdownOpen(false);
    if (!notificationsOpen) {
      const now = new Date().toISOString();
      localStorage.setItem('lastCheckedNotifications', now);
      setLastChecked(now);
    }
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-bg-card border-b border-surface-border flex items-center px-6 gap-4 shrink-0 relative">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
          <input
            type="text"
            placeholder="Search contacts, deals, activities..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-bg-elevated border border-surface-border rounded-lg text-text-primary placeholder-text-muted focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <ThemeToggle />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={handleOpenNotifications}
            className={clsx(
              "relative p-2 rounded-lg transition-colors text-text-muted hover:text-text-primary",
              notificationsOpen ? "bg-bg-hover text-text-primary" : "hover:bg-bg-hover"
            )}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-primary-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotificationsOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-bg-elevated border border-surface-border rounded-xl shadow-elevated z-20 overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between bg-bg-card">
                  <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    Recent Updates
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary-500/10 text-primary-400 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h4>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
                  {activities.length === 0 ? (
                    <div className="p-8 text-center text-text-muted">
                      <Bell className="mx-auto mb-2 text-text-disabled" size={24} />
                      <p className="text-sm">All caught up!</p>
                      <p className="text-xs text-text-disabled mt-0.5">No recent activities found.</p>
                    </div>
                  ) : (
                    activities.map(act => {
                      const isUnread = act.created_at ? new Date(act.created_at) > new Date(lastChecked) : false;

                      return (
                        <div
                          key={act.id}
                          onClick={() => {
                            if (act.contact_id) {
                              navigate(`/contacts/${act.contact_id}`);
                              setNotificationsOpen(false);
                            }
                          }}
                          className={clsx(
                            "p-3.5 flex gap-3 transition-colors cursor-pointer group relative",
                            isUnread ? "bg-primary-500/[0.02] hover:bg-bg-hover" : "hover:bg-bg-hover/50"
                          )}
                        >
                          {/* Icon */}
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm",
                            ACTIVITY_COLORS[act.type] ?? "bg-primary-500/10 text-primary-400"
                          )}>
                            <span>
                              {ACTIVITY_ICONS[act.type] || '🔔'}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-start justify-between gap-1">
                              <p className={clsx(
                                "text-xs font-semibold text-text-primary leading-none truncate flex-1",
                                isUnread && "text-primary-400"
                              )}>
                                {act.title}
                              </p>
                              <span className="text-[10px] text-text-muted whitespace-nowrap">{timeAgo(act.created_at)}</span>
                            </div>
                            <p className="text-xs text-text-secondary mt-1 leading-normal line-clamp-2">
                              {act.body || 'Activity logged.'}
                            </p>
                          </div>

                          {/* Unread indicator */}
                          {isUnread && (
                            <span className="absolute top-1/2 -translate-y-1/2 left-1.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-surface-border flex justify-between items-center bg-bg-card">
                  <button
                    onClick={() => {
                      navigate('/activities');
                      setNotificationsOpen(false);
                    }}
                    className="text-[11px] text-primary-400 hover:text-primary-300 font-medium transition-colors"
                  >
                    View All Activities →
                  </button>
                  <span className="text-[10px] text-text-disabled">Pixel CRM Live Updates</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xs font-bold text-primary-400">
              {getInitials(user?.first_name ?? '', user?.last_name)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-text-primary leading-tight">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-text-muted leading-tight">{ROLE_LABELS[user?.role as string] ?? user?.role}</p>
            </div>
            <ChevronDown size={14} className="text-text-muted" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-52 bg-bg-elevated border border-surface-border rounded-xl shadow-elevated z-20 py-1 animate-fade-in">
                <div className="px-3 py-2 border-b border-surface-border">
                  <p className="text-sm font-medium text-text-primary">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-text-muted">{user?.email}</p>
                </div>
                <button
                  onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
