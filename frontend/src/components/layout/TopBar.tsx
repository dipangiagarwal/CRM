import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { getInitials } from '../../utils/helpers';
import { ThemeToggle } from '../../components/ThemeToggle';

export const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-bg-card border-b border-surface-border flex items-center px-6 gap-4 shrink-0">
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
        {/* Quick Add */}
        <ThemeToggle />
        <button
          onClick={() => navigate('/contacts/new')}
          className="btn-primary btn-sm hidden sm:flex"
        >
          <Plus size={14} />
          <span>New</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-500"></span>
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-xs font-bold text-primary-400">
              {getInitials(user?.first_name ?? '', user?.last_name)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-text-primary leading-tight">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-text-muted capitalize leading-tight">{user?.role}</p>
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
