'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  GripVertical,
  X,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Filter,
  Layers,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { tournamentsApi, type Division } from '@/features/tournaments/api';
import type { Tournament, BracketStage, BracketMatch } from '@/types/tournament';
import type { CourtSetupItem } from './CourtSetup';

export interface ScheduleGridViewProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  courts: CourtSetupItem[];
  divisions?: Division[];
  selectedDivisionId?: string;
  onOpenMatch: (matchId: string) => void;
  onRefetchData?: () => Promise<void>;
  defaultDate?: string;
  venues?: Array<{ id: string; name: string; locationAddress?: string }>;
  currentVenueId?: string;
  onSelectVenue?: (venueId: string) => void;
}

interface GridMatchItem {
  id: string;
  match: BracketMatch;
  stageName: string;
  groupName?: string;
  divisionId?: string;
  divisionName?: string;
  roundNumber?: number | null;
  matchOrder?: number | null;
  courtId?: string | null;
  courtName?: string | null;
  scheduledAt?: string | null;
  durationMinutes: number;
  status?: string;
  participant1Name?: string;
  participant2Name?: string;
  isDraft?: boolean;
}

export function ScheduleGridView({
  tournament,
  bracket,
  courts,
  divisions = [],
  selectedDivisionId = '',
  onOpenMatch,
  onRefetchData,
  defaultDate,
  venues = [],
  currentVenueId,
  onSelectVenue,
}: ScheduleGridViewProps) {
  // ── 1. Date & Operating Window State ──
  const initialDate = useMemo(() => {
    if (defaultDate) {
      const d = defaultDate.split('T')[0];
      if (d) return d;
    }
    if (tournament?.startDate) {
      const d = tournament.startDate.split('T')[0];
      if (d) return d;
    }
    return new Date().toISOString().split('T')[0];
  }, [defaultDate, tournament?.startDate]);

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [operatingStartHour, setOperatingStartHour] = useState<number>(7);
  const [operatingEndHour, setOperatingEndHour] = useState<number>(22);

  // ── 2. Zoom & Layout State (Excel-like row height) ──
  // cellHeightPer30Min in pixels (default 50px per 30 minutes)
  const [cellHeightPer30Min, setCellHeightPer30Min] = useState<number>(50);
  const pixelsPerMinute = cellHeightPer30Min / 30;

  // ── 3. Draft Schedule State ──
  const [draftMatches, setDraftMatches] = useState<Record<string, { courtId: string; scheduledAt: string; durationMinutes: number }>>({});
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // ── 4. Cell Click / Smart Match Assignment Modal State ──
  const [activeCellModal, setActiveCellModal] = useState<{
    courtId: string;
    courtName: string;
    timeSlot: string; // ISO string
    timeLabel: string;
  } | null>(null);

  // Filters inside assignment modal
  const [filterDivisionId, setFilterDivisionId] = useState<string>('ALL');
  const [filterStageType, setFilterStageType] = useState<string>('ALL');
  const [filterRoundNumber, setFilterRoundNumber] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isMultiAssignMode, setIsMultiAssignMode] = useState<boolean>(false);
  const [multiAssignStrategy, setMultiAssignStrategy] = useState<'CONSECUTIVE_TIME' | 'ACROSS_COURTS'>('CONSECUTIVE_TIME');

  // ── 5. Unscheduled Drawer State ──
  const [isUnscheduledDrawerOpen, setIsUnscheduledDrawerOpen] = useState(false);

  // ── 6. Flatten All Matches from Bracket ──
  const allFlattenedMatches = useMemo(() => {
    const list: GridMatchItem[] = [];
    if (!bracket?.stages) return list;

    for (const stage of bracket.stages) {
      const sName = stage.name || (stage.type === 'ROUND_ROBIN' ? 'Vòng bảng' : 'Vòng loại trực tiếp');
      for (const group of stage.groups ?? []) {
        const gName = group.name;
        for (const match of group.matches ?? []) {
          const draft = draftMatches[match.id];
          const division = divisions.find((d) => d.id === selectedDivisionId) || divisions[0];

          const duration = draft?.durationMinutes || 45; // default 45 mins per match
          list.push({
            id: match.id,
            match,
            stageName: sName,
            groupName: gName,
            divisionId: division?.id,
            divisionName: division?.name,
            roundNumber: match.roundNumber,
            matchOrder: match.matchOrder,
            courtId: draft?.courtId !== undefined ? draft.courtId : match.courtId,
            courtName: match.courtName,
            scheduledAt: draft?.scheduledAt !== undefined ? draft.scheduledAt : match.scheduledAt,
            durationMinutes: duration,
            status: match.status,
            participant1Name: match.participant1?.teamName || 'TBD 1',
            participant2Name: match.participant2?.teamName || 'TBD 2',
            isDraft: Boolean(draft),
          });
        }
      }
    }
    return list;
  }, [bracket, draftMatches, divisions]);

  // Matches scheduled on the current selected date
  const scheduledForSelectedDate = useMemo(() => {
    return allFlattenedMatches.filter((m) => {
      if (!m.scheduledAt || !m.courtId) return false;
      const mDate = m.scheduledAt.split('T')[0];
      return mDate === selectedDate;
    });
  }, [allFlattenedMatches, selectedDate]);

  // Unscheduled matches
  const unscheduledMatches = useMemo(() => {
    return allFlattenedMatches.filter((m) => !m.scheduledAt || !m.courtId);
  }, [allFlattenedMatches]);

  // ── 7. Generate 30-Minute Time Slots for Y-Axis ──
  const timeSlots = useMemo(() => {
    const slots: Array<{
      hour: number;
      minute: number;
      label: string;
      isoString: string;
      minutesFromStart: number;
    }> = [];

    const totalHours = operatingEndHour - operatingStartHour;
    const totalSlots = totalHours * 2; // 30 min per slot

    for (let i = 0; i <= totalSlots; i++) {
      const totalMinutes = i * 30;
      const hour = operatingStartHour + Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const hStr = hour.toString().padStart(2, '0');
      const mStr = minute.toString().padStart(2, '0');
      const label = `${hStr}:${mStr}`;
      const isoString = `${selectedDate}T${hStr}:${mStr}:00.000Z`;

      slots.push({
        hour,
        minute,
        label,
        isoString,
        minutesFromStart: totalMinutes,
      });
    }
    return slots;
  }, [operatingStartHour, operatingEndHour, selectedDate]);

  const gridTotalHeight = (operatingEndHour - operatingStartHour) * 2 * cellHeightPer30Min;

  // ── 8. Conflict Detection ──
  const conflictMatchIds = useMemo(() => {
    const conflicts = new Set<string>();
    // Check court overlap
    for (let i = 0; i < scheduledForSelectedDate.length; i++) {
      for (let j = i + 1; j < scheduledForSelectedDate.length; j++) {
        const m1 = scheduledForSelectedDate[i];
        const m2 = scheduledForSelectedDate[j];
        if (m1.courtId === m2.courtId && m1.scheduledAt && m2.scheduledAt) {
          const t1Start = new Date(m1.scheduledAt).getTime();
          const t1End = t1Start + m1.durationMinutes * 60 * 1000;
          const t2Start = new Date(m2.scheduledAt).getTime();
          const t2End = t2Start + m2.durationMinutes * 60 * 1000;

          if (t1Start < t2End && t2Start < t1End) {
            conflicts.add(m1.id);
            conflicts.add(m2.id);
          }
        }
      }
    }
    return conflicts;
  }, [scheduledForSelectedDate]);

  // ── 9. Drag & Drop Handlers ──
  const handleDragStart = (e: React.DragEvent, matchId: string) => {
    e.dataTransfer.setData('text/plain', matchId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCellDrop = (e: React.DragEvent, courtId: string, slotIsoString: string) => {
    e.preventDefault();
    const matchId = e.dataTransfer.getData('text/plain');
    if (!matchId) return;

    const matchItem = allFlattenedMatches.find((m) => m.id === matchId);
    if (!matchItem) return;

    setDraftMatches((prev) => ({
      ...prev,
      [matchId]: {
        courtId,
        scheduledAt: slotIsoString,
        durationMinutes: prev[matchId]?.durationMinutes || matchItem.durationMinutes || 45,
      },
    }));

    toast.success(`Đã xếp trận vào ${formatTimeSlot(slotIsoString)}`);
  };

  const handleCellDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // ── 10. Unassign / Remove Match from Schedule ──
  const handleUnassignMatch = (matchId: string) => {
    setDraftMatches((prev) => ({
      ...prev,
      [matchId]: {
        courtId: '',
        scheduledAt: '',
        durationMinutes: 45,
      },
    }));
    toast.success('Đã gỡ trận khỏi lịch thi đấu');
  };

  // ── 11. Save All Draft Changes ──
  const handleSaveAllChanges = async () => {
    const draftKeys = Object.keys(draftMatches);
    if (draftKeys.length === 0) {
      toast('Không có thay đổi nào cần lưu.', { icon: 'ℹ️' });
      return;
    }

    setIsSavingSchedule(true);
    let successCount = 0;
    try {
      for (const matchId of draftKeys) {
        const draft = draftMatches[matchId];
        await tournamentsApi.updateMatchSchedule(matchId, {
          courtId: draft.courtId || null,
          scheduledAt: draft.scheduledAt || null,
        });
        successCount++;
      }

      setDraftMatches({});
      toast.success(`Đã lưu lịch thi đấu cho ${successCount} trận thành công!`);
      if (onRefetchData) {
        await onRefetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu lịch thi đấu.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // ── 12. Smart Assign from Modal ──
  const handleAssignSelectedMatches = () => {
    if (!activeCellModal) return;
    if (selectedMatchIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 trận để xếp.');
      return;
    }

    const { courtId, timeSlot } = activeCellModal;
    const baseTime = new Date(timeSlot).getTime();
    const newDrafts = { ...draftMatches };

    const sortedCourtList = courts.length > 0 ? courts : [{ id: courtId, courtName: 'Sân 1' }];
    const currentCourtIndex = Math.max(0, sortedCourtList.findIndex((c) => c.id === courtId));

    selectedMatchIds.forEach((matchId, index) => {
      const matchItem = allFlattenedMatches.find((m) => m.id === matchId);
      const duration = matchItem?.durationMinutes || 45;

      if (multiAssignStrategy === 'CONSECUTIVE_TIME') {
        // Next matches in subsequent 30/45 min slots on the same court
        const matchTime = new Date(baseTime + index * duration * 60 * 1000).toISOString();
        newDrafts[matchId] = {
          courtId,
          scheduledAt: matchTime,
          durationMinutes: duration,
        };
      } else {
        // Across courts at the same time
        const targetCourt = sortedCourtList[(currentCourtIndex + index) % sortedCourtList.length];
        newDrafts[matchId] = {
          courtId: targetCourt.id,
          scheduledAt: timeSlot,
          durationMinutes: duration,
        };
      }
    });

    setDraftMatches(newDrafts);
    toast.success(`Đã xếp ${selectedMatchIds.length} trận đấu!`);
    setActiveCellModal(null);
    setSelectedMatchIds([]);
  };

  // Helper formatting
  const formatTimeSlot = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return iso;
    }
  };

  // Filtered matches in modal
  const modalFilteredMatches = useMemo(() => {
    return unscheduledMatches.filter((m) => {
      if (filterDivisionId !== 'ALL' && m.divisionId !== filterDivisionId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p1 = (m.participant1Name || '').toLowerCase();
        const p2 = (m.participant2Name || '').toLowerCase();
        const st = (m.stageName || '').toLowerCase();
        if (!p1.includes(q) && !p2.includes(q) && !st.includes(q)) return false;
      }
      return true;
    });
  }, [unscheduledMatches, filterDivisionId, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ── TOOLBAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Left: Date navigation + Venue Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1">
            <button
              type="button"
              onClick={() => {
                const cur = new Date(selectedDate);
                cur.setDate(cur.getDate() - 1);
                setSelectedDate(cur.toISOString().split('T')[0]);
              }}
              className="rounded p-1 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Ngày trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const cur = new Date(selectedDate);
                cur.setDate(cur.getDate() + 1);
                setSelectedDate(cur.toISOString().split('T')[0]);
              }}
              className="rounded p-1 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Ngày tiếp theo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Venue Switcher (if multiple venues or single venue display) */}
          {venues.length > 1 ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <select
                value={currentVenueId || tournament.venueId || ''}
                onChange={(e) => onSelectVenue?.(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {venues.map((v, i) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {i === 0 ? '⭐ (Mặc định)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span>{venues[0]?.name || tournament.city || 'Sân thi đấu chính'}</span>
            </div>
          )}
        </div>

        {/* Right: Zoom + Unscheduled Badge + Save Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Thu/Phóng:</span>
            <button
              type="button"
              onClick={() => setCellHeightPer30Min((prev) => Math.max(30, prev - 10))}
              className="rounded p-1 hover:bg-slate-200 text-slate-600"
              title="Thu nhỏ ô"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-bold text-slate-700 w-8 text-center">
              {Math.round((cellHeightPer30Min / 50) * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setCellHeightPer30Min((prev) => Math.min(100, prev + 10))}
              className="rounded p-1 hover:bg-slate-200 text-slate-600"
              title="Phóng to ô"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Unscheduled Count Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsUnscheduledDrawerOpen(true)}
            className="relative border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold"
          >
            <Layers className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            Chưa xếp lịch
            <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700">
              {unscheduledMatches.length}
            </span>
          </Button>

          {/* Save Draft Changes Button */}
          {Object.keys(draftMatches).length > 0 && (
            <Button
              type="button"
              onClick={handleSaveAllChanges}
              disabled={isSavingSchedule}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs animate-pulse"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {isSavingSchedule ? 'Đang lưu...' : `Lưu (${Object.keys(draftMatches).length}) thay đổi`}
            </Button>
          )}
        </div>
      </div>

      {/* ── CONFLICT ALERT BANNER ── */}
      {conflictMatchIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 animate-in fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>
            Phát hiện <strong>{conflictMatchIds.size} trận</strong> bị trùng giờ hoặc trùng sân thi đấu! Vui lòng kéo thả lại để giải phóng sân.
          </span>
        </div>
      )}

      {/* ── MAIN SCHEDULE GRID (Excel-like) ── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Inner Scrollable Container */}
        <div className="max-h-[680px] overflow-auto select-none">
          <div
            className="grid min-w-[760px]"
            style={{
              gridTemplateColumns: `80px repeat(${Math.max(1, courts.length)}, minmax(160px, 1fr))`,
            }}
          >
            {/* Top-Left Corner Header */}
            <div className="sticky top-0 left-0 z-30 flex items-center justify-center border-b border-r border-slate-200 bg-slate-100/95 backdrop-blur-xs p-2 text-xs font-bold text-slate-700">
              <Clock className="mr-1 h-3.5 w-3.5 text-slate-500" />
              Giờ
            </div>

            {/* Sticky Court Column Headers */}
            {courts.length === 0 ? (
              <div className="sticky top-0 z-20 flex items-center justify-center border-b border-slate-200 bg-slate-100/95 backdrop-blur-xs p-3 text-xs font-bold text-slate-500">
                Chưa có sân nào. Vui lòng thêm sân tại tab "Lịch & Địa điểm".
              </div>
            ) : (
              courts.map((court, idx) => (
                <div
                  key={court.id}
                  className="sticky top-0 z-20 flex items-center justify-between border-b border-r border-slate-200 bg-slate-100/95 backdrop-blur-xs px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-900">{court.courtName || `Sân ${idx + 1}`}</p>
                    <span className="inline-block text-[9px] font-semibold text-emerald-600 uppercase">Sẵn sàng</span>
                  </div>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                    #{idx + 1}
                  </span>
                </div>
              ))
            )}

            {/* Time Column (Sticky Left) */}
            <div className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50/95">
              {timeSlots.map((slot, index) => {
                const isHourMark = slot.minute === 0;
                return (
                  <div
                    key={slot.label}
                    className={`flex items-start justify-end pr-2.5 border-b text-[11px] font-bold transition-colors ${
                      isHourMark
                        ? 'border-slate-300 text-slate-800 bg-slate-100/50'
                        : 'border-slate-200/60 text-slate-400 font-medium'
                    }`}
                    style={{ height: `${cellHeightPer30Min}px` }}
                  >
                    <span className="-mt-2.5">{slot.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Court Columns (Grid Cells & Match Cards) */}
            {courts.map((court) => {
              const courtMatches = scheduledForSelectedDate.filter((m) => m.courtId === court.id);

              return (
                <div
                  key={court.id}
                  className="relative border-r border-slate-200 bg-white"
                  style={{ height: `${gridTotalHeight}px` }}
                >
                  {/* Grid Rows / Cell Slots */}
                  {timeSlots.map((slot) => {
                    const isHourMark = slot.minute === 0;
                    return (
                      <div
                        key={slot.label}
                        onDragOver={handleCellDragOver}
                        onDrop={(e) => handleCellDrop(e, court.id, slot.isoString)}
                        onClick={() => {
                          setActiveCellModal({
                            courtId: court.id,
                            courtName: court.courtName,
                            timeSlot: slot.isoString,
                            timeLabel: slot.label,
                          });
                        }}
                        className={`group relative border-b transition-colors hover:bg-blue-50/50 cursor-pointer ${
                          isHourMark ? 'border-slate-200' : 'border-slate-100'
                        }`}
                        style={{ height: `${cellHeightPer30Min}px` }}
                      >
                        {/* Hover Plus Icon */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                            <Plus className="h-3 w-3" />
                            Xếp trận
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Absolute Positioned Match Cards */}
                  {courtMatches.map((m) => {
                    if (!m.scheduledAt) return null;
                    const mDate = new Date(m.scheduledAt);
                    const matchStartMinutes = (mDate.getHours() - operatingStartHour) * 60 + mDate.getMinutes();
                    const topPos = Math.max(0, matchStartMinutes * pixelsPerMinute);
                    const cardHeight = Math.max(38, m.durationMinutes * pixelsPerMinute - 4);
                    const isConflict = conflictMatchIds.has(m.id);

                    return (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, m.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMatch(m.id);
                        }}
                        className={`absolute inset-x-1.5 z-10 flex flex-col justify-between rounded-lg border p-2 shadow-xs transition-all cursor-grab active:cursor-grabbing hover:shadow-md hover:ring-2 hover:ring-blue-400 ${
                          isConflict
                            ? 'border-rose-400 bg-rose-50 text-rose-950 ring-1 ring-rose-300'
                            : m.isDraft
                              ? 'border-amber-400 bg-amber-50 text-amber-950'
                              : 'border-blue-200 bg-blue-50/90 text-blue-950'
                        }`}
                        style={{
                          top: `${topPos + 2}px`,
                          height: `${cardHeight}px`,
                        }}
                      >
                        {/* Match Header */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="text-[10px] font-extrabold text-blue-700 truncate">
                                {formatTimeSlot(m.scheduledAt)} ({m.durationMinutes}p)
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-extrabold text-slate-900">
                              {m.participant1Name}
                            </p>
                            <p className="truncate text-[11px] font-extrabold text-slate-900">
                              {m.participant2Name}
                            </p>
                          </div>

                          {/* Quick Unassign Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnassignMatch(m.id);
                            }}
                            className="rounded p-0.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                            title="Bỏ xếp trận này"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Match Meta Footer */}
                        <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 pt-1 border-t border-slate-200/50">
                          <span className="truncate">{m.stageName}</span>
                          {m.roundNumber && <span>Vòng {m.roundNumber}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SMART MATCH ASSIGNMENT MODAL (Click Cell Popup) ── */}
      {activeCellModal && (
        <Modal open={Boolean(activeCellModal)} onOpenChange={(open) => !open && setActiveCellModal(null)}>
          <ModalContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-2xl">
            <ModalHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <ModalTitle className="text-base font-bold text-slate-900">
                    Xếp trận vào: <span className="text-blue-600">{activeCellModal.courtName}</span> lúc{' '}
                    <span className="text-blue-600">{activeCellModal.timeLabel}</span>
                  </ModalTitle>
                  <ModalDescription className="text-xs text-slate-500 mt-0.5">
                    Chọn trận đấu chưa xếp lịch để đưa vào sân thi đấu.
                  </ModalDescription>
                </div>
              </div>
            </ModalHeader>

            {/* Filter Bar */}
            <div className="my-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên VĐV/Đội..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none w-full text-xs font-semibold text-slate-800"
                />
              </div>

              {divisions.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={filterDivisionId}
                    onChange={(e) => setFilterDivisionId(e.target.value)}
                    className="bg-transparent outline-none w-full text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="ALL">Tất cả nội dung thi đấu</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Multi-Select Quick Assign Mode Switch */}
            <div className="flex items-center justify-between rounded-xl bg-blue-50/70 border border-blue-100 p-2.5 text-xs text-blue-900 mb-3">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMultiAssignMode}
                  onChange={(e) => {
                    setIsMultiAssignMode(e.target.checked);
                    if (!e.target.checked) setSelectedMatchIds([]);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <span>Chế độ xếp nhanh nhiều trận liên tiếp</span>
              </label>

              {isMultiAssignMode && (
                <select
                  value={multiAssignStrategy}
                  onChange={(e) => setMultiAssignStrategy(e.target.value as any)}
                  className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px] font-bold text-blue-800"
                >
                  <option value="CONSECUTIVE_TIME">Xếp liên tiếp theo giờ (Cùng sân)</option>
                  <option value="ACROSS_COURTS">Xếp cùng giờ (Rải đều các sân)</option>
                </select>
              )}
            </div>

            {/* Matches List */}
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {modalFilteredMatches.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  Không tìm thấy trận đấu nào phù hợp.
                </div>
              ) : (
                modalFilteredMatches.map((m) => {
                  const isSelected = selectedMatchIds.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (isMultiAssignMode) {
                          setSelectedMatchIds((prev) =>
                            isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                          );
                        } else {
                          setSelectedMatchIds([m.id]);
                        }
                      }}
                      className={`flex items-center justify-between rounded-xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isMultiAssignMode ? (
                          isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 shrink-0" />
                          )
                        ) : null}

                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {m.participant1Name} <span className="text-slate-400 font-normal">vs</span> {m.participant2Name}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            {m.stageName} {m.groupName ? `· ${m.groupName}` : ''} {m.roundNumber ? `· Vòng ${m.roundNumber}` : ''}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMatchIds([m.id]);
                          setTimeout(() => handleAssignSelectedMatches(), 0);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-7 px-3 rounded-lg"
                      >
                        Xếp ô này
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <ModalFooter className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Đã chọn: <strong>{selectedMatchIds.length}</strong> trận
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setActiveCellModal(null)}>
                  Hủy
                </Button>
                {isMultiAssignMode && (
                  <Button
                    type="button"
                    onClick={handleAssignSelectedMatches}
                    disabled={selectedMatchIds.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    Xác nhận xếp {selectedMatchIds.length} trận
                  </Button>
                )}
              </div>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* ── UNSCHEDULED MATCHES DRAWER ── */}
      {isUnscheduledDrawerOpen && (
        <Modal open={isUnscheduledDrawerOpen} onOpenChange={setIsUnscheduledDrawerOpen}>
          <ModalContent className="max-w-xl bg-white p-6 rounded-2xl shadow-2xl">
            <ModalHeader>
              <ModalTitle className="text-base font-bold text-slate-900">
                Danh sách trận chưa xếp lịch ({unscheduledMatches.length})
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Kéo thả các trận đấu này vào lưới lịch thi đấu hoặc bấm vào ô lưới để xếp.
              </ModalDescription>
            </ModalHeader>

            <div className="max-h-[360px] overflow-y-auto space-y-2 mt-3 pr-1">
              {unscheduledMatches.length === 0 ? (
                <div className="text-center py-8 text-xs text-emerald-600 font-bold">
                  🎉 Tất cả các trận đấu đã được xếp lịch hoàn tất!
                </div>
              ) : (
                unscheduledMatches.map((m) => (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, m.id)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3 transition-all hover:bg-blue-50/60 hover:border-blue-300 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GripVertical className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {m.participant1Name} <span className="text-slate-400 font-normal">vs</span> {m.participant2Name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {m.stageName} {m.groupName ? `· ${m.groupName}` : ''} {m.roundNumber ? `· Vòng ${m.roundNumber}` : ''}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenMatch(m.id)}
                      className="text-xs font-bold h-7 border-slate-200"
                    >
                      Chi tiết
                    </Button>
                  </div>
                ))
              )}
            </div>

            <ModalFooter className="mt-4">
              <Button type="button" onClick={() => setIsUnscheduledDrawerOpen(false)}>
                Đóng
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
