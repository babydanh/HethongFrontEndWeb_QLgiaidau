'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shuffle, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TournamentParticipant } from '@/types/tournament';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableSeedItemProps {
  p: TournamentParticipant;
  dragTitle: string;
}

const SortableSeedItem = React.memo(function SortableSeedItem({ p, dragTitle }: SortableSeedItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: p.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors select-none ${
        isDragging
          ? 'border-blue-300 bg-blue-50/40 shadow-sm'
          : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors touch-none"
          title={dragTitle}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
          #{p.seed}
        </span>
        <span className="text-sm font-bold text-slate-900 truncate">{p.teamName}</span>
      </div>
    </div>
  );
});

interface SeedingManagerCardProps {
  seedingMethod: 'ELO' | 'RANDOM' | 'MANUAL';
  setSeedingMethod: (method: 'ELO' | 'RANDOM' | 'MANUAL') => void;
  isAutoSeeding: boolean;
  handleAutoSeed: () => void;
  handleSwapSeeds: (draggedId: string, targetId: string) => void;
  handleReorderSeeds?: (reordered: { participantId: string; seed: number }[]) => Promise<void>;
  participants: TournamentParticipant[];
  onAssignSeedClick?: (participantId: string) => void;
}

export function SeedingManagerCard({
  seedingMethod,
  setSeedingMethod,
  isAutoSeeding,
  handleAutoSeed,
  handleSwapSeeds,
  handleReorderSeeds,
  participants,
  onAssignSeedClick,
}: SeedingManagerCardProps) {
  const registrationTranslate = useTranslations('tournamentManage.registration');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const seeded = [...participants]
    .filter((p) => p.seed != null)
    .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
  const unseeded = [...participants].filter((p) => p.seed == null);

  const handleSeedDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleSeedDragCancel = () => {
    setActiveDragId(null);
  };

  const handleSeedDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const oldIdx = seeded.findIndex((p) => p.id === active.id);
    const newIdx = seeded.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(seeded, oldIdx, newIdx).map((p, idx) => ({
      participantId: p.id,
      seed: idx + 1,
    }));

    if (handleReorderSeeds) {
      void handleReorderSeeds(reordered);
    } else {
      const dragged = seeded[oldIdx];
      const target = seeded[newIdx];
      void handleSwapSeeds(dragged.id, target.id);
    }
  };

  const activeDragParticipant = activeDragId
    ? participants.find((p) => p.id === activeDragId)
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-purple-600" /> {registrationTranslate('seedingTitle')}
        </h3>
        <p className="text-xs text-slate-500 mt-1 font-semibold">{registrationTranslate('seedingDescription')}</p>
      </div>

      {/* Seeding method */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{registrationTranslate('seedingMethodLabel')}</label>
        <select
          value={seedingMethod}
          onChange={(e) => setSeedingMethod(e.target.value as 'ELO' | 'RANDOM' | 'MANUAL')}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="MANUAL">{registrationTranslate('manualSeeding')}</option>
          <option value="ELO">{registrationTranslate('eloSeeding')}</option>
          <option value="RANDOM">{registrationTranslate('randomSeeding')}</option>
        </select>
      </div>

      {/* Auto seeding button for ELO or RANDOM */}
      {(seedingMethod === 'ELO' || seedingMethod === 'RANDOM') && (
        <Button
          onClick={handleAutoSeed}
          disabled={isAutoSeeding || participants.length < 2}
          className="w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none font-bold"
        >
          {isAutoSeeding ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {registrationTranslate('seedingInProgress')}</>
          ) : (
            <><Shuffle className="w-3.5 h-3.5" /> {registrationTranslate('autoSeed')}</>
          )}
        </Button>
      )}

      {/* Manual seed list (draggable up/down) */}
      {seedingMethod === 'MANUAL' && (
        <div className="space-y-1">
          {participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <Shuffle className="w-6 h-6 text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-500">{registrationTranslate('noRegisteredTeams')}</p>
            </div>
          ) : (
            <>
              {seeded.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleSeedDragStart}
                  onDragEnd={handleSeedDragEnd}
                  onDragCancel={handleSeedDragCancel}
                >
                  <SortableContext items={seeded.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                      {seeded.map((p) => (
                        <SortableSeedItem key={p.id} p={p} dragTitle={registrationTranslate('dragToSort')} />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeDragParticipant ? (
                      <div className="flex items-center justify-between rounded-lg border border-blue-400 bg-white px-3 py-2.5 shadow-xl ring-2 ring-blue-500/20 select-none">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1 text-blue-600">
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 shadow-sm">
                            #{activeDragParticipant.seed}
                          </span>
                          <span className="text-sm font-bold text-slate-900 truncate">{activeDragParticipant.teamName}</span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
              {unseeded.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {registrationTranslate('unseededCount', { count: unseeded.length })}
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {unseeded.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs font-bold shrink-0">
                            ?
                          </span>
                          <span className="text-xs font-bold text-slate-500 truncate">{p.teamName}</span>
                        </div>
                        {onAssignSeedClick && (
                          <button
                            type="button"
                            onClick={() => onAssignSeedClick(p.id)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            {registrationTranslate('assignSeed')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
