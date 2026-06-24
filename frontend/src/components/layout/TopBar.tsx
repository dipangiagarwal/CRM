import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, LogOut, Settings, X, Info, UserCheck, Briefcase } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { getInitials, ROLE_LABELS } from '../../utils/helpers';
import { ThemeToggle } from '../../components/ThemeToggle';
import { clsx } from 'clsx';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'assignment' | 'deal' | 'system';
  read: boolean;
}

export const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Lead Assigned',
      description: 'Manish Kumar has been assigned to you by Admin.',
      time: '2 hours ago',
      type: 'assignment',
      read: false,
    },
    {
      id: '2',
      title: 'Deal Updated',
      description: 'Acme Corp deal moved to Negotiation stage.',
      time: '1 day ago',
      type: 'deal',
      read: false,
    },
    {
      id: '3',
      title: 'Welcome to Pixel CRM',
      description: 'Start managing your contacts, pipelines, and team members.',
      time: '2 days ago',
      type: 'system',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling read status
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
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
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setDropdownOpen(false);
            }}
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
                    Notifications
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary-500/10 text-primary-400 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-text-muted">
                      <Bell className="mx-auto mb-2 text-text-disabled" size={24} />
                      <p className="text-sm">All caught up!</p>
                      <p className="text-xs text-text-disabled mt-0.5">No new notifications.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => toggleRead(n.id)}
                        className={clsx(
                          "p-3.5 flex gap-3 transition-colors cursor-pointer group relative",
                          n.read ? "hover:bg-bg-hover/50" : "bg-primary-500/[0.02] hover:bg-bg-hover"
                        )}
                      >
                        {/* Icon */}
                        <div className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm",
                          n.type === 'assignment' && "bg-blue-500/10 text-blue-400",
                          n.type === 'deal' && "bg-emerald-500/10 text-emerald-400",
                          n.type === 'system' && "bg-purple-500/10 text-purple-400"
                        )}>
                          {n.type === 'assignment' && <UserCheck size={14} />}
                          {n.type === 'deal' && <Briefcase size={14} />}
                          {n.type === 'system' && <Info size={14} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-start justify-between gap-1">
                            <p className={clsx(
                              "text-xs font-semibold text-text-primary leading-none",
                              !n.read && "text-primary-400"
                            )}>
                              {n.title}
                            </p>
                            <span className="text-[10px] text-text-muted whitespace-nowrap">{n.time}</span>
                          </div>
                          <p className="text-xs text-text-secondary mt-1 leading-normal line-clamp-2">
                            {n.description}
                          </p>
                        </div>

                        {/* Action buttons (dismiss) */}
                        <button
                          onClick={(e) => deleteNotification(n.id, e)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-hover text-text-muted hover:text-red-400 transition-all"
                          title="Dismiss"
                        >
                          <X size={12} />
                        </button>

                        {/* Unread indicator */}
                        {!n.read && (
                          <span className="absolute top-1/2 -translate-y-1/2 left-1.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-surface-border flex justify-between items-center bg-bg-card">
                    <button
                      onClick={clearAll}
                      className="text-[11px] text-text-muted hover:text-red-400 transition-colors font-medium"
                    >
                      Clear all
                    </button>
                    <span className="text-[10px] text-text-disabled">Pixel CRM Notifications</span>
                  </div>
                )}
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
