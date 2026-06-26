import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Building2,
  Clock,
  ExternalLink,
  ChevronDown,
  Phone,
  Mail,
  FileText,
  Users,
  CheckSquare,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Loader2,
  X,
  Inbox
} from 'lucide-react';
import { activitiesApi } from '../../api/activities';
import { analyticsApi } from '../../api/analytics';
import { contactsApi } from '../../api/contacts';
import { Modal } from '../../components/ui/Modal';
import { ActivityForm } from '../../components/forms/ActivityForm';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { timeAgo, ACTIVITY_COLORS, capitalize } from '../../utils/helpers';
import { clsx } from 'clsx';
import type { ActivityType, Activity } from '../../types';
import { isToday, isYesterday, subDays, startOfDay, parseISO } from 'date-fns';

const ACTIVITY_TYPES: ActivityType[] = ['call', 'email', 'note', 'meeting', 'task', 'message'];

const ACTIVITY_LUCIDE_ICONS: Record<ActivityType, React.ReactNode> = {
  call: <Phone size={16} />,
  email: <Mail size={16} />,
  note: <FileText size={16} />,
  meeting: <Users size={16} />,
  task: <CheckSquare size={16} />,
  message: <MessageSquare size={16} />,
};

const TimelineSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse mt-4">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <div className="h-6 w-28 bg-bg-elevated border border-surface-border/40 rounded-lg ml-14" />
          <div className="space-y-4">
            {[1, 2].map((j) => (
              <div key={j} className="relative flex gap-4 ml-14">
                <div className="absolute -left-14 top-4 w-10 h-10 rounded-full bg-bg-elevated border border-surface-border/40" />
                <div className="flex-1 bg-bg-card/45 border border-surface-border/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bg-elevated" />
                      <div className="space-y-1">
                        <div className="h-3.5 w-24 bg-bg-elevated rounded" />
                        <div className="h-2.5 w-16 bg-bg-elevated rounded" />
                      </div>
                    </div>
                    <div className="h-3 w-16 bg-bg-elevated rounded" />
                  </div>
                  <div className="h-4 w-1/3 bg-bg-elevated rounded mt-2" />
                  <div className="h-3.5 w-2/3 bg-bg-elevated rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const ActivitiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const { user } = useAuthStore();

  const [selectedType, setSelectedType] = useState<ActivityType | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editActivity, setEditActivity] = useState<Activity | null>(null);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Focus search box with '/' key shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch contacts for dropdown & mapping names/companies
  const { data: contacts } = useQuery({
    queryKey: ['contacts', 'select'],
    queryFn: () => contactsApi.list({ limit: 250 }),
  });

  // Contact list mapped to id -> contact
  const contactMap = useMemo(() => {
    const map = new Map<string, any>();
    if (contacts?.contacts) {
      contacts.contacts.forEach((c) => {
        map.set(c.id, c);
      });
    }
    return map;
  }, [contacts]);

  // Infinite query for activities list
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['activities', 'all', selectedType],
    queryFn: ({ pageParam }) =>
      activitiesApi.list({
        type: selectedType || undefined,
        cursor: pageParam,
        limit: 15,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });

  // Fetch activity summary counts
  const { data: statsData } = useQuery({
    queryKey: ['analytics', 'activities'],
    queryFn: analyticsApi.activities,
  });

  // Map stats data for quick lookups
  const statsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (statsData?.activities) {
      statsData.activities.forEach((item) => {
        map.set(item.type, item);
      });
    }
    return map;
  }, [statsData]);

  // Flattened array of activities from all query pages
  const allActivities = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.activities);
  }, [data]);

  // Filter activities client-side based on search box input
  const filteredActivities = useMemo(() => {
    let list = allActivities;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((act) => {
        const contact = contactMap.get(act.contact_id);
        const contactName = contact
          ? `${contact.first_name} ${contact.last_name || ''}`.toLowerCase()
          : '';
        const companyName = contact?.company_name?.toLowerCase() || '';

        return (
          act.title.toLowerCase().includes(q) ||
          (act.body && act.body.toLowerCase().includes(q)) ||
          contactName.includes(q) ||
          companyName.includes(q)
        );
      });
    }

    return list;
  }, [allActivities, searchQuery, contactMap]);

  // Group activities chronologically
  const groupedActivities = useMemo(() => {
    const groups: {
      Today: Activity[];
      Yesterday: Activity[];
      'Last 7 Days': Activity[];
      Older: Activity[];
    } = {
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      Older: [],
    };

    filteredActivities.forEach((act) => {
      if (!act.created_at) {
        groups.Older.push(act);
        return;
      }
      try {
        const date = parseISO(act.created_at);
        if (isToday(date)) {
          groups.Today.push(act);
        } else if (isYesterday(date)) {
          groups.Yesterday.push(act);
        } else if (date >= startOfDay(subDays(new Date(), 7))) {
          groups['Last 7 Days'].push(act);
        } else {
          groups.Older.push(act);
        }
      } catch {
        groups.Older.push(act);
      }
    });

    return groups;
  }, [filteredActivities]);

  // Check if there are any activities in any group
  const hasGroupedActivities = useMemo(() => {
    return Object.values(groupedActivities).some((group) => group.length > 0);
  }, [groupedActivities]);

  // Delete Mutation with query invalidations
  const deleteMutation = useMutation({
    mutationFn: activitiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'activities'] });
      addToast({ type: 'success', title: 'Activity deleted' });
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.detail ?? 'Failed to delete activity' });
    },
  });

  // Calculate statistics items
  const statsCards = useMemo(() => {
    const cardDefs: {
      type: ActivityType;
      label: string;
      icon: React.ReactNode;
      colorClass: string;
      bgClass: string;
      glowClass: string;
    }[] = [
      {
        type: 'call',
        label: 'Calls',
        icon: <Phone size={18} />,
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/10 border-emerald-500/20',
        glowClass: 'hover:shadow-emerald-500/5 hover:border-emerald-500/30',
      },
      {
        type: 'email',
        label: 'Emails',
        icon: <Mail size={18} />,
        colorClass: 'text-blue-400',
        bgClass: 'bg-blue-500/10 border-blue-500/20',
        glowClass: 'hover:shadow-blue-500/5 hover:border-blue-500/30',
      },
      {
        type: 'meeting',
        label: 'Meetings',
        icon: <Users size={18} />,
        colorClass: 'text-purple-400',
        bgClass: 'bg-purple-500/10 border-purple-500/20',
        glowClass: 'hover:shadow-purple-500/5 hover:border-purple-500/30',
      },
      {
        type: 'task',
        label: 'Tasks',
        icon: <CheckSquare size={18} />,
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-500/10 border-orange-500/20',
        glowClass: 'hover:shadow-orange-500/5 hover:border-orange-500/30',
      },
      {
        type: 'note',
        label: 'Notes',
        icon: <FileText size={18} />,
        colorClass: 'text-yellow-400',
        bgClass: 'bg-yellow-500/10 border-yellow-500/20',
        glowClass: 'hover:shadow-yellow-500/5 hover:border-yellow-500/30',
      },
    ];

    return cardDefs.map((def) => {
      const summary = statsMap.get(def.type);
      const thisWeek = summary?.this_week ?? 0;
      const lastWeek = summary?.last_week ?? 0;

      let changeText = '';
      let changeTrend: 'up' | 'down' | 'neutral' = 'neutral';
      let changePercent = 0;

      if (lastWeek > 0) {
        changePercent = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
        changeText = `${changePercent >= 0 ? '+' : ''}${changePercent}% vs last week`;
        changeTrend = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral';
      } else if (thisWeek > 0) {
        changeText = `+${thisWeek} this week`;
        changeTrend = 'up';
      } else {
        changeText = 'No recent activity';
        changeTrend = 'neutral';
      }

      return {
        ...def,
        thisWeek,
        lastWeek,
        changeText,
        changeTrend,
      };
    });
  }, [statsMap]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight bg-gradient-to-r from-primary-400 to-indigo-300 bg-clip-text text-transparent">
            Activities Timeline
          </h1>
          <p className="text-text-muted mt-0.5 text-sm">
            {allActivities.length} activities logged overall
          </p>
        </div>
        {user?.role !== 'viewer' && (
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary btn-md rounded-xl font-semibold flex items-center gap-1.5 shadow-glow transition-all duration-200"
          >
            <Plus size={16} /> Log Activity
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statsCards.map((card) => (
          <div
            key={card.type}
            className={clsx(
              'card-elevated bg-bg-card/40 backdrop-blur-md border border-surface-border/40 p-4 transition-all duration-300 rounded-2xl flex flex-col justify-between group cursor-default shadow-card',
              card.glowClass
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-muted tracking-wider uppercase">
                {card.label}
              </span>
              <div className={clsx('p-2 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm', card.bgClass, card.colorClass)}>
                {card.icon}
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary tracking-tight">
                  {card.thisWeek}
                </span>
                <span className="text-[10px] text-text-muted">this week</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {card.changeTrend === 'up' && (
                  <TrendingUp size={11} className="text-emerald-400 shrink-0" />
                )}
                {card.changeTrend === 'down' && (
                  <TrendingDown size={11} className="text-red-400 shrink-0" />
                )}
                {card.changeTrend === 'neutral' && (
                  <Minus size={11} className="text-text-muted shrink-0" />
                )}
                <span
                  className={clsx(
                    'text-[10px] font-medium leading-none truncate',
                    card.changeTrend === 'up' && 'text-emerald-400',
                    card.changeTrend === 'down' && 'text-red-400',
                    card.changeTrend === 'neutral' && 'text-text-muted'
                  )}
                >
                  {card.changeText}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky top filter bar */}
      <div className="sticky top-0 z-30 bg-bg/85 backdrop-blur-lg border-b border-surface-border/50 py-4 -mx-6 px-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md group">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-400 transition-colors"
          />
          <input
            ref={searchInputRef}
            type="text"
            className="w-full bg-bg-elevated/45 border border-surface-border/40 hover:border-surface-muted/65 focus:border-primary-500 rounded-xl pl-10 pr-9 py-2 text-sm text-text-primary placeholder-text-disabled outline-none transition-all duration-150"
            placeholder="Search activity notes, contact, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-text-disabled bg-bg-elevated border border-surface-border/50 px-1.5 py-0.5 rounded pointer-events-none select-none">
              /
            </kbd>
          )}
        </div>

        {/* Category Filter animated pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedType('')}
            className={clsx(
              'badge px-3.5 py-2 cursor-pointer transition-all duration-200 border relative overflow-hidden font-semibold flex items-center gap-1.5 rounded-full select-none text-[11px]',
              selectedType === ''
                ? 'bg-primary-500/10 text-primary-400 border-primary-500/30 shadow-glow'
                : 'text-text-muted bg-bg-elevated/40 border-surface-border/40 hover:border-surface-muted/60 hover:text-text-secondary'
            )}
          >
            <Sparkles size={13} />
            All
          </button>
          {ACTIVITY_TYPES.map((type) => {
            const isSelected = selectedType === type;
            const summary = statsMap.get(type);
            const countText = summary ? `(${summary.this_week})` : '';
            return (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? '' : type)}
                className={clsx(
                  'badge px-3.5 py-2 cursor-pointer transition-all duration-200 border relative overflow-hidden font-semibold flex items-center gap-1.5 rounded-full select-none text-[11px]',
                  isSelected
                    ? `${ACTIVITY_COLORS[type]} border-current/20 shadow-glow`
                    : 'text-text-muted bg-bg-elevated/40 border-surface-border/40 hover:border-surface-muted/60 hover:text-text-secondary'
                )}
              >
                <span className={clsx('shrink-0', isSelected ? 'scale-110 transition-transform' : '')}>
                  {ACTIVITY_LUCIDE_ICONS[type]}
                </span>
                <span>{capitalize(type)}</span>
                {countText && <span className="opacity-60 text-[9px] font-medium">{countText}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline rendering states */}
      {isLoading ? (
        <TimelineSkeleton />
      ) : isError ? (
        <div className="text-center py-10 card border-red-500/20 bg-red-500/5 max-w-xl mx-auto rounded-2xl">
          <p className="text-red-400 font-semibold text-sm">Failed to load activities timeline</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['activities'] })}
            className="btn-secondary btn-sm mt-3 rounded-lg"
          >
            Try Again
          </button>
        </div>
      ) : !hasGroupedActivities ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center card bg-bg-card/25 border-dashed border-2 border-surface-border/60 rounded-3xl max-w-2xl mx-auto shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-bg-elevated/45 border border-surface-border/50 flex items-center justify-center text-text-muted mb-5 relative group">
            <div className="absolute inset-0 bg-primary-500/5 rounded-2xl scale-0 group-hover:scale-100 transition-transform duration-300" />
            <Inbox size={36} className="text-text-muted/80 group-hover:text-primary-400 transition-colors duration-300" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">
            {searchQuery ? 'No matching activities' : 'No activities logged yet'}
          </h3>
          <p className="text-sm text-text-muted max-w-md mb-6 leading-relaxed">
            {searchQuery
              ? `We couldn't find any activities matching "${searchQuery}". Try updating your search keywords or category filters.`
              : 'Log your customer calls, follow-up emails, notes, and tasks here to build a comprehensive timeline of interaction.'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('');
              }}
              className="btn-secondary btn-md rounded-xl font-medium"
            >
              Clear Search & Filters
            </button>
          ) : (
            user?.role !== 'viewer' && (
              <button
                onClick={() => setCreateOpen(true)}
                className="btn-primary btn-md rounded-xl font-medium"
              >
                <Plus size={14} /> Log Your First Activity
              </button>
            )
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Main Vertical connector line */}
          <div className="absolute left-7 top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary-500/40 via-surface-border/60 to-surface-border/10" />

          {Object.entries(groupedActivities).map(([groupName, list]) => {
            if (list.length === 0) return null;

            return (
              <div key={groupName} className="space-y-6 mb-8 relative">
                {/* Group Date Header */}
                <div className="relative flex items-center gap-3 pl-14">
                  {/* Visual marker on the line */}
                  <div className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500 border border-bg shadow-sm z-10" />
                  <h3 className="text-[11px] font-extrabold text-text-muted tracking-wider uppercase">
                    {groupName}
                  </h3>
                  <span className="badge bg-bg-elevated/80 border border-surface-border/40 text-text-muted text-[10px] px-2 py-0.5 rounded-full font-medium scale-90">
                    {list.length} {list.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Activity Cards List */}
                <div className="space-y-4">
                  {list.map((act) => {
                    const contact = contactMap.get(act.contact_id);
                    const hasContact = !!contact;
                    return (
                      <div key={act.id} className="relative flex gap-4 ml-14 group/card">
                        {/* Timeline Node Icon */}
                        <div
                          className={clsx(
                            'absolute -left-14 top-4 w-10 h-10 rounded-full flex items-center justify-center border border-surface-border shadow bg-bg-elevated transition-all duration-300 z-10 text-base',
                            ACTIVITY_COLORS[act.type],
                            'group-hover/card:scale-105 group-hover/card:border-primary-500/40 group-hover/card:shadow-glow'
                          )}
                        >
                          {ACTIVITY_LUCIDE_ICONS[act.type]}
                        </div>

                        {/* Card Content wrapper */}
                        <div className="flex-1 bg-bg-card/40 backdrop-blur-md border border-surface-border/40 rounded-2xl p-5 hover:border-primary-500/20 transition-all duration-300 hover:shadow-card hover:bg-bg-card/75 relative">
                          {/* Top row: Contact, badge, actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-surface-border/30">
                            {/* Contact Info */}
                            <div
                              onClick={() => hasContact && navigate(`/contacts/${contact.id}`)}
                              className={clsx(
                                'flex items-center gap-2.5 min-w-0',
                                hasContact ? 'cursor-pointer group/contact' : 'cursor-default'
                              )}
                            >
                              <Avatar
                                firstName={contact?.first_name || 'U'}
                                lastName={contact?.last_name || 'N'}
                                avatarUrl={contact?.avatar_url}
                                size="sm"
                                className="group-hover/contact:scale-105 transition-transform"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate group-hover/contact:text-primary-400 transition-colors leading-tight">
                                  {hasContact
                                    ? `${contact.first_name} ${contact.last_name || ''}`
                                    : 'Unknown Contact'}
                                </p>
                                {contact?.company_name && (
                                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5 truncate font-medium">
                                    <Building2 size={11} className="text-text-disabled" />
                                    {contact.company_name}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Meta & Actions */}
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              {/* Relative time & badge */}
                              <span className="text-xs text-text-muted flex items-center gap-1 font-medium">
                                <Clock size={12} className="text-text-disabled" />
                                {timeAgo(act.created_at)}
                              </span>
                              <span
                                className={clsx(
                                  'badge text-[10px] font-semibold border capitalize px-2.5 py-0.5 rounded-full',
                                  ACTIVITY_COLORS[act.type],
                                  'border-current/10'
                                )}
                              >
                                {act.type}
                              </span>

                              {/* Hover Actions */}
                              <div className="flex items-center bg-bg-elevated/90 backdrop-blur-sm border border-surface-border/60 rounded-lg p-0.5 opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/card:pointer-events-auto absolute right-5 top-4 sm:static shadow-sm">
                                {hasContact && (
                                  <button
                                    onClick={() => navigate(`/contacts/${contact.id}`)}
                                    className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all duration-150"
                                    title="View Contact Profile"
                                  >
                                    <ExternalLink size={12} />
                                  </button>
                                )}
                                {user?.role !== 'viewer' && (
                                  <>
                                    <button
                                      onClick={() => setEditActivity(act)}
                                      className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-primary-400 transition-all duration-150"
                                      title="Edit Activity Notes"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => deleteMutation.mutate(act.id)}
                                      className="p-1 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all duration-150"
                                      title="Delete Activity"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Title and Notes */}
                          <div className="pt-3">
                            <h4 className="text-sm font-bold text-text-primary tracking-wide">
                              {act.title}
                            </h4>
                            {act.body && (
                              <p className="text-sm text-text-secondary mt-1.5 leading-relaxed whitespace-pre-wrap font-sans">
                                {act.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Load More Action */}
      {hasNextPage && !isLoading && (
        <div className="flex flex-col items-center justify-center mt-8 pb-12">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="btn-secondary btn-md rounded-xl font-semibold flex items-center gap-2 border border-surface-border/60 shadow-sm hover:border-primary-500/30 hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group text-xs px-4 py-2"
          >
            {isFetchingNextPage ? (
              <Loader2 size={14} className="animate-spin text-primary-400" />
            ) : (
              <ChevronDown size={14} className="text-text-muted group-hover:text-text-primary group-hover:translate-y-0.5 transition-transform" />
            )}
            Load More Activities
          </button>
          <span className="text-[10px] text-text-muted mt-2">
            Showing {filteredActivities.length} activities
          </span>
        </div>
      )}

      {/* Skeleton for loading next page */}
      {isFetchingNextPage && (
        <div className="space-y-4 mt-4 ml-14 max-w-none">
          {[1].map((i) => (
            <div key={i} className="relative flex gap-4 animate-pulse">
              <div className="absolute -left-14 top-4 w-10 h-10 rounded-full bg-bg-elevated border border-surface-border/40" />
              <div className="flex-1 bg-bg-card/30 border border-surface-border/40 rounded-2xl p-5 space-y-3">
                <div className="h-4 w-1/3 bg-bg-elevated rounded" />
                <div className="h-3 w-2/3 bg-bg-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Log New Activity" size="md">
        <div className="mb-4">
          <label className="label">Contact *</label>
          <select
            className="input-field"
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
          >
            <option value="">Select a contact</option>
            {contacts?.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name || ''} {c.company_name ? `(${c.company_name})` : ''}
              </option>
            ))}
          </select>
        </div>
        {selectedContactId ? (
          <ActivityForm
            contactId={selectedContactId}
            onSuccess={() => {
              setCreateOpen(false);
              setSelectedContactId('');
              queryClient.invalidateQueries({ queryKey: ['activities'] });
              queryClient.invalidateQueries({ queryKey: ['analytics', 'activities'] });
            }}
            onCancel={() => {
              setCreateOpen(false);
              setSelectedContactId('');
            }}
          />
        ) : (
          <p className="text-sm text-text-muted text-center py-4">Please select a contact above to continue.</p>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editActivity} onClose={() => setEditActivity(null)} title="Edit Activity Notes" size="md">
        {editActivity && (
          <ActivityForm
            contactId={editActivity.contact_id}
            activity={editActivity}
            onSuccess={() => {
              setEditActivity(null);
              queryClient.invalidateQueries({ queryKey: ['activities'] });
              queryClient.invalidateQueries({ queryKey: ['analytics', 'activities'] });
            }}
            onCancel={() => setEditActivity(null)}
          />
        )}
      </Modal>
    </div>
  );
};
