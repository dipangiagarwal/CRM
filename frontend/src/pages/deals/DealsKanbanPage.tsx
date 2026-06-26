import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Plus, LayoutList, Kanban, Calendar } from 'lucide-react';
import { dealsApi } from '../../api/deals';
import { Modal } from '../../components/ui/Modal';
import { DealForm } from '../../components/forms/DealForm';
import { KanbanSkeleton } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import {
  formatCurrency, formatDate, DEAL_STAGES, STAGE_LABELS, STAGE_COLORS, STAGE_DOT_COLORS
} from '../../utils/helpers';
import { clsx } from 'clsx';
import type { Deal, DealStage } from '../../types';

const STAGE_BG: Record<string, string> = {
  new: 'border-primary-500/20 bg-primary-500/[0.01]',
  qualified: 'border-blue-500/20 bg-blue-500/[0.01]',
  proposal: 'border-yellow-500/20 bg-yellow-500/[0.01]',
  negotiation: 'border-orange-500/20 bg-orange-500/[0.01]',
  won: 'border-emerald-500/20 bg-emerald-500/[0.01]',
  lost: 'border-red-500/20 bg-red-500/[0.01]',
};

const STAGE_HEADER: Record<string, string> = {
  new: 'text-primary-400',
  qualified: 'text-blue-400',
  proposal: 'text-yellow-400',
  negotiation: 'text-orange-400',
  won: 'text-emerald-400',
  lost: 'text-red-400',
};

export const DealsKanbanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const { data, isLoading } = useQuery({
    queryKey: ['deals', 'all'],
    queryFn: () => dealsApi.list({ limit: 100 }),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage, lost_reason }: { id: string; stage: DealStage; lost_reason?: string }) =>
      dealsApi.updateStage(id, { stage, lost_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      addToast({ type: 'success', title: 'Deal stage updated' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update deal stage' }),
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId as DealStage;
    const deal = data?.deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;
    stageMutation.mutate({ id: dealId, stage: newStage });
  };

  if (isLoading) return <div className="p-6"><KanbanSkeleton /></div>;

  const dealsByStage = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage] = (data?.deals ?? []).filter(d => d.stage === stage);
    return acc;
  }, {} as Record<string, Deal[]>);

  const totalPipelineValue = (data?.deals ?? [])
    .filter(d => !['won', 'lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Sales Pipeline</h1>
          <p className="text-text-muted mt-0.5 text-xs font-medium">
            {data?.total ?? 0} active deals · Total pipeline value: <span className="text-emerald-400 font-bold">{formatCurrency(totalPipelineValue)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* View toggle */}
          <div className="flex items-center p-1 rounded-xl bg-bg-card border border-surface-border">
            <button
              onClick={() => setViewMode('kanban')}
              className={clsx(
                'p-1.5 rounded-lg transition-colors border border-transparent', 
                viewMode === 'kanban' 
                  ? 'bg-bg-hover text-primary-400 border-surface-border' 
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Kanban Board"
            >
              <Kanban size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-1.5 rounded-lg transition-colors border border-transparent', 
                viewMode === 'list' 
                  ? 'bg-bg-hover text-primary-400 border-surface-border' 
                  : 'text-text-muted hover:text-text-primary'
              )}
              title="Table view"
            >
              <LayoutList size={14} />
            </button>
          </div>
          {user?.role !== 'viewer' && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary btn-sm flex items-center gap-1.5">
              <Plus size={14} /> New Deal
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = dealsByStage[stage];
              const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);

              return (
                <div key={stage} className={clsx('shrink-0 w-72 flex flex-col rounded-2xl border bg-bg-card p-1.5', STAGE_BG[stage])}>
                  {/* Column header */}
                  <div className="px-3.5 py-3 border-b border-surface-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={clsx('w-2 h-2 rounded-full', STAGE_DOT_COLORS[stage])} />
                        <span className={clsx('text-xs font-bold truncate uppercase tracking-wider', STAGE_HEADER[stage])}>
                          {STAGE_LABELS[stage]}
                        </span>
                        <span className="w-5 h-5 rounded-lg bg-bg bg-opacity-70 text-[10px] font-bold text-text-muted flex items-center justify-center border border-surface-border/60">
                          {stageDeals.length}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-text-primary mt-1.5">{formatCurrency(stageValue)}</p>
                  </div>

                  {/* Cards container */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={clsx(
                          'flex-1 p-1.5 space-y-2 min-h-[360px] rounded-b-2xl transition-colors max-h-[calc(100vh-280px)] overflow-y-auto',
                          snapshot.isDraggingOver ? 'bg-bg-hover/30' : ''
                        )}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index} isDragDisabled={user?.role === 'viewer'}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={clsx(
                                  'bg-bg-elevated border border-surface-border rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-surface-muted transition-all duration-150',
                                  snapshot.isDragging ? 'shadow-elevated rotate-1 border-primary-500 ring-2 ring-primary-500/10' : ''
                                )}
                                onClick={() => navigate(`/deals/${deal.id}`)}
                              >
                                <p className="text-xs font-bold text-text-primary mb-2.5 leading-snug hover:text-primary-400 transition-colors">
                                  {deal.title}
                                </p>

                                {deal.value !== undefined && (
                                  <div className="flex items-center gap-1 mb-3">
                                    <span className="text-xs font-extrabold text-emerald-400">{formatCurrency(deal.value)}</span>
                                  </div>
                                )}

                                {/* Probability Meter */}
                                <div className="space-y-1 mb-3">
                                  <div className="flex justify-between text-[9px] text-text-muted font-bold uppercase tracking-wider">
                                    <span>Probability</span>
                                    <span>{deal.probability}%</span>
                                  </div>
                                  <div className="h-1 bg-bg-hover rounded-full overflow-hidden border border-surface-border/25">
                                    <div 
                                      className="h-full bg-primary-500 rounded-full transition-all duration-300"
                                      style={{ width: `${deal.probability}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-text-muted font-semibold border-t border-surface-border/30 pt-2.5">
                                  {deal.expected_close && (
                                    <div className="flex items-center gap-1">
                                      <Calendar size={11} className="text-text-disabled" />
                                      <span>{formatDate(deal.expected_close)}</span>
                                    </div>
                                  )}
                                  <span className="text-[9px] font-bold text-primary-400 uppercase bg-primary-500/10 px-1.5 py-0.5 rounded-md border border-primary-500/10">
                                    Deal
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {stageDeals.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-24 text-[10px] text-text-disabled border border-dashed border-surface-border/60 rounded-xl font-medium">
                            No deals here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          {data?.deals.length === 0 ? (
            <EmptyState
              title="No deals found"
              description="Create your first deal to track it in the sales pipeline."
              action={user?.role !== 'viewer' ? <button onClick={() => setCreateOpen(true)} className="btn-primary btn-md"><Plus size={14} /> New Deal</button> : undefined}
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border bg-bg-elevated">
                  {['Deal Title', 'Pipeline Stage', 'Value', 'Probability', 'Close Date', 'Created Date'].map(h => (
                    <th key={h} className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-4 py-3 border-b border-surface-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {data?.deals.map(deal => (
                  <tr key={deal.id} className="table-row-hover" onClick={() => navigate(`/deals/${deal.id}`)}>
                    <td className="px-4 py-3 text-xs font-bold text-text-primary hover:text-primary-400 transition-colors">{deal.title}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge text-[9px] py-0 px-2 font-bold', STAGE_COLORS[deal.stage])}>{STAGE_LABELS[deal.stage]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-emerald-400 font-bold">{formatCurrency(deal.value)}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary font-medium">{deal.probability}%</td>
                    <td className="px-4 py-3 text-xs text-text-muted font-medium">{formatDate(deal.expected_close ?? undefined)}</td>
                    <td className="px-4 py-3 text-xs text-text-muted font-medium">{formatDate(deal.created_at ?? undefined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create New Deal" size="lg">
        <DealForm
          onSuccess={() => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ['deals'] }); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
};
