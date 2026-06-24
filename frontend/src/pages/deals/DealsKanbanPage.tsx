import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Plus, LayoutList, Kanban, IndianRupee, Calendar } from 'lucide-react';
import { dealsApi } from '../../api/deals';
import { Modal } from '../../components/ui/Modal';
import { DealForm } from '../../components/forms/DealForm';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import {
  formatCurrency, formatDate, DEAL_STAGES, STAGE_LABELS, STAGE_COLORS, STAGE_DOT_COLORS
} from '../../utils/helpers';
import { clsx } from 'clsx';
import type { Deal, DealStage } from '../../types';

const STAGE_BG: Record<string, string> = {
  new: 'border-primary-500/30',
  qualified: 'border-blue-500/30',
  proposal: 'border-yellow-500/30',
  negotiation: 'border-orange-500/30',
  won: 'border-emerald-500/30',
  lost: 'border-red-500/30',
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

  if (isLoading) return <PageLoader />;

  const dealsByStage = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage] = (data?.deals ?? []).filter(d => d.stage === stage);
    return acc;
  }, {} as Record<string, Deal[]>);

  const totalPipelineValue = (data?.deals ?? [])
    .filter(d => !['won', 'lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sales Pipeline</h1>
          <p className="text-text-muted mt-1 text-sm">
            {data?.total ?? 0} deals · Pipeline value: <span className="text-emerald-400 font-semibold">{formatCurrency(totalPipelineValue)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center p-1 rounded-lg bg-bg-elevated border border-surface-border">
            <button
              onClick={() => setViewMode('kanban')}
              className={clsx('p-2 rounded-md transition-colors', viewMode === 'kanban' ? 'bg-bg-card text-primary-400' : 'text-text-muted hover:text-text-primary')}
            >
              <Kanban size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx('p-2 rounded-md transition-colors', viewMode === 'list' ? 'bg-bg-card text-primary-400' : 'text-text-muted hover:text-text-primary')}
            >
              <LayoutList size={15} />
            </button>
          </div>
          {user?.role !== 'viewer' && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary btn-sm">
              <Plus size={14} /> New Deal
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = dealsByStage[stage];
              const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);

              return (
                <div key={stage} className={clsx('shrink-0 w-72 flex flex-col rounded-xl border bg-bg-card', STAGE_BG[stage])}>
                  {/* Column header */}
                  <div className="p-3 border-b border-surface-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={clsx('w-2.5 h-2.5 rounded-full', STAGE_DOT_COLORS[stage])} />
                        <span className={clsx('text-sm font-semibold', STAGE_HEADER[stage])}>
                          {STAGE_LABELS[stage]}
                        </span>
                        <span className="w-5 h-5 rounded-full bg-bg-elevated text-xs font-bold text-text-muted flex items-center justify-center">
                          {stageDeals.length}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{formatCurrency(stageValue)}</p>
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={clsx(
                          'flex-1 p-2 space-y-2 min-h-[200px] rounded-b-xl transition-colors',
                          snapshot.isDraggingOver ? 'bg-bg-hover' : ''
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
                                  'bg-bg-elevated border border-surface-border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-surface-muted transition-all',
                                  snapshot.isDragging ? 'shadow-elevated rotate-1 border-primary-500/30' : ''
                                )}
                                onClick={() => navigate(`/deals/${deal.id}`)}
                              >
                                <p className="text-sm font-semibold text-text-primary mb-2 leading-tight">
                                  {deal.title}
                                </p>

                                {deal.value && (
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <IndianRupee size={11} className="text-emerald-400" />
                                    <span className="text-sm font-bold text-emerald-400">{formatCurrency(deal.value)}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-xs text-text-muted">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                                    <span>{deal.probability}%</span>
                                  </div>
                                  {deal.expected_close && (
                                    <div className="flex items-center gap-1">
                                      <Calendar size={10} />
                                      {formatDate(deal.expected_close)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {stageDeals.length === 0 && (
                          <div className="flex items-center justify-center h-20 text-xs text-text-disabled border border-dashed border-surface-border rounded-xl">
                            Drop here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>

                  {/* Add button */}
                  {user?.role !== 'viewer' && (
                    <button
                      onClick={() => setCreateOpen(true)}
                      className="m-2 p-2 rounded-xl border border-dashed border-surface-border text-xs text-text-muted hover:text-text-primary hover:border-surface-muted transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> Add deal
                    </button>
                  )}
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
              title="No deals yet"
              description="Create your first deal to track it in the pipeline."
              action={user?.role !== 'viewer' ? <button onClick={() => setCreateOpen(true)} className="btn-primary btn-md"><Plus size={14} /> New Deal</button> : undefined}
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border bg-bg-elevated text-left">
                  {['Title', 'Stage', 'Value', 'Probability', 'Close Date', 'Created'].map(h => (
                    <th key={h} className="text-xs font-semibold text-text-muted uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data?.deals.map(deal => (
                  <tr key={deal.id} className="table-row-hover" onClick={() => navigate(`/deals/${deal.id}`)}>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">{deal.title}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge', STAGE_COLORS[deal.stage])}>{STAGE_LABELS[deal.stage]}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-400 font-semibold">{formatCurrency(deal.value)}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{deal.probability}%</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatDate(deal.expected_close ?? undefined)}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatDate(deal.created_at ?? undefined)}</td>
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
