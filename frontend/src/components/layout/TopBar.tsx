import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Search, ChevronDown, LogOut, Settings, Plus, Users, Briefcase, UserCheck, ChevronRight, LayoutDashboard, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { activitiesApi } from '../../api/activities';
import { timeAgo, ACTIVITY_ICONS, ACTIVITY_COLORS } from '../../utils/helpers';
import { ThemeToggle } from '../../components/ThemeToggle';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';

interface TopBarProps {
  onSearchClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearchClick }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);

  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [lastChecked, setLastChecked] = useState<string>(() => {
    return localStorage.getItem('lastCheckedNotifications') || new Date(0).toISOString();
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['activities', 'recent-notifications'],
    queryFn: () => activitiesApi.list({ limit: 8 }),
    refetchInterval: 20_000, // poll every 20s
  });

  const activities = activitiesData?.activities ?? [];

  const unreadCount = activities.filter(act => {
    if (!act.created_at) return false;
    return new Date(act.created_at) > new Date(lastChecked);
  }).length;

  const handleOpenNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    setDropdownOpen(false);
    setCreateDropdownOpen(false);
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

  // Build Breadcrumbs from Path
  const getBreadcrumbs = (): { label: string; path: string; isLast: boolean }[] => {
    const pathnames = location.pathname.split('/').filter(x => x);
    if (pathnames.length === 0) return [{ label: 'Dashboard', path: '/dashboard', isLast: true }];

    const breadcrumbs = pathnames.map((name, index) => {
      const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
      const isLast = index === pathnames.length - 1;
      let label = name.replace(/-/g, ' ');
      
      // Capitalize first letter
      label = label.charAt(0).toUpperCase() + label.slice(1);
      
      // Shorten UUIDs/ID parameters
      if (label.length > 15 && /\d/.test(label)) {
        label = 'Details';
      }

      return { label, path: routeTo, isLast };
    });

    return breadcrumbs;
  };

  return (
    <header className="h-14 bg-bg-card border-b border-surface-border flex items-center px-6 gap-4 shrink-0 relative z-20 select-none">
      {/* Breadcrumbs (Left side) */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
        <Link to="/dashboard" className="hover:text-text-primary transition-colors flex items-center gap-1">
          <LayoutDashboard size={13} className="text-text-muted/70" />
          <span>Pixel</span>
        </Link>
        {getBreadcrumbs().map((bc) => (
          <React.Fragment key={bc.path}>
            <ChevronRight size={12} className="text-text-disabled" />
            <Link 
              to={bc.path} 
              className={clsx(
                "transition-colors",
                bc.isLast ? "text-text-primary cursor-default pointer-events-none" : "hover:text-text-primary"
              )}
            >
              {bc.label}
            </Link>
          </React.Fragment>
        ))}
      </div>

      {/* Global Search Bar (Trigger command palette on click) */}
      <div className="flex-1 max-w-sm ml-6 hidden md:block">
        <button 
          onClick={onSearchClick}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-bg bg-opacity-70 hover:bg-bg-hover text-text-muted hover:text-text-secondary border border-surface-border rounded-xl transition-all text-left text-xs outline-none"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-text-muted" />
            <span>Search workspace...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-surface-border bg-bg-card text-[9px] font-semibold">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Side Options */}
      <div className="flex items-center gap-2.5 ml-auto">
        {/* Mobile Search Button */}
        <button 
          onClick={onSearchClick}
          className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors md:hidden"
        >
          <Search size={16} />
        </button>

        {/* Quick Create Dropdown */}
        {user?.role !== 'viewer' && (
          <div className="relative">
            <button
              onClick={() => {
                setCreateDropdownOpen(!createDropdownOpen);
                setNotificationsOpen(false);
                setDropdownOpen(false);
              }}
              className={clsx(
                "flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-all shadow-sm shadow-primary-500/10 hover:shadow-glow",
                createDropdownOpen && "bg-primary-600 scale-[0.98]"
              )}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Create</span>
              <ChevronDown size={12} className="opacity-80" />
            </button>

            {createDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCreateDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-bg-elevated border border-surface-border rounded-2xl shadow-elevated z-20 py-1 animate-fade-in p-1">
                  <button
                    onClick={() => { navigate('/contacts/new'); setCreateDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors text-left"
                  >
                    <Users size={14} className="text-primary-400" />
                    New Contact
                  </button>
                  <button
                    onClick={() => { navigate('/deals'); setCreateDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors text-left"
                  >
                    <Briefcase size={14} className="text-emerald-400" />
                    New Deal
                  </button>
                  <button
                    onClick={() => { navigate('/tasks'); setCreateDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors text-left"
                  >
                    <UserCheck size={14} className="text-blue-400" />
                    New Task
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <span className="hidden md:inline-flex items-center gap-2 text-xs font-bold text-text-primary bg-bg-elevated border border-surface-border rounded-xl px-3 py-1.5 shadow-sm transition-all duration-200 hover:bg-bg-hover hover:border-primary-500/30 hover:shadow-glow cursor-default select-none">
          <Clock size={13} className="text-primary-400" />
          <span>
            {time.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }) + ', ' + time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </span>
        </span>

        <ThemeToggle />

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            onClick={handleOpenNotifications}
            className={clsx(
              "relative p-2 rounded-xl transition-all duration-200 text-text-muted hover:text-text-primary border border-transparent hover:bg-bg-hover hover:border-primary-500/30 hover:shadow-glow",
              notificationsOpen ? "bg-bg-hover text-text-primary border-surface-border" : ""
            )}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full flex items-center justify-center animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotificationsOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-bg-elevated border border-surface-border rounded-2xl shadow-elevated z-20 overflow-hidden animate-fade-in p-1">
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-surface-border/60 flex items-center justify-between bg-bg-card rounded-t-xl">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary-500/10 text-primary-400 rounded-full border border-primary-500/20">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-surface-border/40 p-1">
                  {activities.length === 0 ? (
                    <div className="py-12 text-center text-text-muted">
                      <Bell className="mx-auto mb-2 text-text-disabled" size={20} />
                      <p className="text-xs font-semibold">Everything read!</p>
                      <p className="text-[10px] text-text-disabled mt-0.5">No recent updates logged.</p>
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
                            "p-2.5 flex gap-3 transition-all rounded-xl cursor-pointer mt-1 first:mt-0 relative group border border-transparent",
                            isUnread ? "bg-primary-500/[0.03] border-primary-500/10 hover:bg-bg-hover" : "hover:bg-bg-hover/50"
                          )}
                        >
                          {/* Left Accent indicator */}
                          {isUnread && (
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary-500" />
                          )}

                          {/* Icon */}
                          <div className={clsx(
                            "w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 text-xs",
                            ACTIVITY_COLORS[act.type] ?? "bg-primary-500/10 text-primary-400"
                          )}>
                            <span>
                              {ACTIVITY_ICONS[act.type] || '🔔'}
                            </span>
                          </div>

                          {/* Text Content */}
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-start justify-between gap-1">
                              <p className={clsx(
                                "text-xs font-bold text-text-primary leading-tight truncate flex-1 transition-colors",
                                isUnread && "text-primary-400"
                              )}>
                                {act.title}
                              </p>
                              <span className="text-[9px] text-text-muted whitespace-nowrap font-medium">{timeAgo(act.created_at)}</span>
                            </div>
                            <p className="text-[11px] text-text-secondary mt-0.5 leading-snug line-clamp-2">
                              {act.body || 'Activity log detail.'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-surface-border/60 flex justify-between items-center bg-bg-card rounded-b-xl">
                  <button
                    onClick={() => {
                      navigate('/activities');
                      setNotificationsOpen(false);
                    }}
                    className="text-[10px] text-primary-400 hover:text-primary-300 font-bold transition-colors uppercase tracking-wider"
                  >
                    View All Activities →
                  </button>
                  <span className="text-[9px] text-text-disabled font-medium">Live Feed</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User profile details popover */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotificationsOpen(false);
              setCreateDropdownOpen(false);
            }}
            className={clsx(
              "flex items-center gap-2 p-1 rounded-xl transition-all border border-transparent hover:bg-bg-hover hover:border-primary-500/30 hover:shadow-glow",
              dropdownOpen ? "bg-bg-hover border-surface-border" : ""
            )}
          >
            <Avatar firstName={user?.first_name ?? ''} lastName={user?.last_name} avatarUrl={user?.avatar_url} size="xs" className="w-7 h-7 rounded-lg shadow-sm border border-surface-border/50" />
            <ChevronDown size={12} className="text-text-muted hidden sm:block mr-0.5" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-bg-elevated border border-surface-border rounded-2xl shadow-elevated z-20 py-1.5 animate-fade-in p-1">
                <div className="px-2.5 py-2 border-b border-surface-border/60">
                  <p className="text-xs font-semibold text-text-primary">{user?.first_name} {user?.last_name}</p>
                  <p className="text-[10px] text-text-muted truncate mt-0.5 font-medium">{user?.email}</p>
                </div>
                <button
                  onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors mt-1"
                >
                  <Settings size={13} />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                >
                  <LogOut size={13} />
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
