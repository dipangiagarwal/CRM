import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, User, Briefcase, Settings, LayoutDashboard, Moon, Sun, ArrowRight, Zap, Users, UserCheck, Activity, BarChart3, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { contactsApi } from '../../api/contacts';
import { dealsApi } from '../../api/deals';
import { useTheme } from '../../context/ThemeContext';
import { clsx } from 'clsx';

interface CommandItem {
  label: string;
  sublabel?: string;
  path?: string;
  action?: () => void;
  icon: React.ComponentType<any>;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC and arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Query contacts/deals based on search
  const { data: contactsData } = useQuery({
    queryKey: ['command-palette-contacts', search],
    queryFn: () => contactsApi.list({ search, limit: 5 }),
    enabled: isOpen && search.length > 1,
  });

  const { data: dealsData } = useQuery({
    queryKey: ['command-palette-deals', search],
    queryFn: () => dealsApi.list({ limit: 100 }), 
    enabled: isOpen && search.length > 1,
  });

  const contacts = contactsData?.contacts ?? [];
  const deals = (dealsData?.deals ?? []).filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  // static items when no query
  const navigationItems: CommandItem[] = [
    { label: 'Go to Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { label: 'Go to Leads (Contacts)', path: '/contacts', icon: Users, category: 'Navigation' },
    { label: 'Go to Tasks', path: '/tasks', icon: UserCheck, category: 'Navigation' },
    { label: 'Go to Sales Pipeline (Deals)', path: '/deals', icon: Briefcase, category: 'Navigation' },
    { label: 'Go to Activities Feed', path: '/activities', icon: Activity, category: 'Navigation' },
    { label: 'Go to Reports & Analytics', path: '/reports', icon: BarChart3, category: 'Navigation' },
    { label: 'Go to Team Management', path: '/team', icon: Users, category: 'Navigation' },
    { label: 'Go to Billing', path: '/billing', icon: CreditCard, category: 'Navigation' },
    { label: 'Go to Settings', path: '/settings', icon: Settings, category: 'Navigation' },
  ];

  const actionItems: CommandItem[] = [
    { 
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, 
      action: () => { toggleTheme(); onClose(); }, 
      icon: theme === 'dark' ? Sun : Moon, 
      category: 'Preferences' 
    },
  ];

  // Combine items depending on search status
  const visibleItems: CommandItem[] = search.length <= 1 
    ? [...navigationItems, ...actionItems] 
    : [
        ...contacts.map(c => ({
          label: `${c.first_name} ${c.last_name || ''}`,
          sublabel: c.company_name || c.email || 'Lead',
          path: `/contacts/${c.id}`,
          icon: User,
          category: 'Leads'
        })),
        ...deals.map(d => ({
          label: d.title,
          sublabel: `Stage: ${d.stage} · Probability: ${d.probability}%`,
          path: `/deals/${d.id}`,
          icon: Briefcase,
          category: 'Deals'
        })),
        ...navigationItems.filter(item => item.label.toLowerCase().includes(search.toLowerCase())),
        ...actionItems.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
      ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % visibleItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + visibleItems.length) % visibleItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = visibleItems[selectedIndex];
      if (selected) {
        if ('path' in selected && selected.path) {
          navigate(selected.path);
        } else if ('action' in selected && selected.action) {
          selected.action();
        }
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Main command palette popup */}
      <div 
        className="relative w-full max-w-xl bg-bg-elevated border border-surface-border rounded-2xl shadow-elevated overflow-hidden animate-fade-in"
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
          <Search size={18} className="text-text-muted shrink-0" />
          <input 
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-0 ring-0 focus:ring-0 text-text-primary placeholder-text-muted text-sm outline-none"
            placeholder="Type a command or search contacts and deals..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg border border-surface-border bg-bg-card text-[10px] font-medium text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {visibleItems.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm space-y-2">
              <Sparkles className="mx-auto text-text-disabled" size={24} />
              <p>No results found for "{search}"</p>
            </div>
          ) : (
            <div>
              {/* Group items by category */}
              {Array.from(new Set(visibleItems.map(item => item.category))).map(category => {
                const categoryItems = visibleItems.filter(item => item.category === category);
                return (
                  <div key={category} className="space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider mt-2 first:mt-0">
                      {category}
                    </div>
                    {categoryItems.map((item) => {
                      // Find real index in visibleItems
                      const realIndex = visibleItems.indexOf(item);
                      const isSelected = realIndex === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <div
                          key={realIndex}
                          onClick={() => {
                            if ('path' in item && item.path) {
                              navigate(item.path);
                            } else if ('action' in item && item.action) {
                              item.action();
                            }
                            onClose();
                          }}
                          className={clsx(
                            "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                            isSelected ? "bg-primary-500/10 text-primary-400 border border-primary-500/10" : "text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon size={16} className="shrink-0 text-text-muted" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.label}</p>
                              {'sublabel' in item && item.sublabel && (
                                <p className="text-xs text-text-muted truncate mt-0.5">{item.sublabel}</p>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <ArrowRight size={14} className="text-primary-400 mr-1 animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-bg-card border-t border-surface-border flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-surface-border bg-bg-elevated font-semibold">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-surface-border bg-bg-elevated font-semibold">Enter</kbd> Select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap size={11} className="text-primary-400" />
            <span>Pixel Quick Nav</span>
          </div>
        </div>
      </div>
    </div>
  );
};
