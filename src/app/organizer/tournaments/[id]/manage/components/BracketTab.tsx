'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Settings } from 'lucide-react';
import { Tournament, BracketStage, BracketMatch } from '@/types/tournament';
import PublicBracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';

interface BracketTabProps {
  tournament: Tournament;
  bracket: { stages: BracketStage[] } | null;
  selectedDivisionId: string;
  participants: unknown[];
  isGeneratingBracket: boolean;
  handleGenerateBracket: () => void;
  handleOpenScheduling: (match: BracketMatch) => void;
  handleOpenStageModal?: (stage: BracketStage) => void;
}

export function BracketTab({
  tournament,
  bracket,
  selectedDivisionId,
  participants,
  isGeneratingBracket,
  handleGenerateBracket,
  handleOpenScheduling,
  handleOpenStageModal
}: BracketTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Nút khởi tạo bracket nếu chưa có */}
      {(!bracket || !bracket.stages || bracket.stages.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center gap-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Sơ đồ thi đấu Bracket</h2>
            <p className="text-sm text-slate-500">Chưa có sơ đồ. Hãy khởi tạo để bắt đầu.</p>
          </div>
          <Button
            onClick={handleGenerateBracket}
            disabled={isGeneratingBracket || !selectedDivisionId || participants.length < 2}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-xl"
          >
            {isGeneratingBracket ? 'Đang khởi tạo...' : 'Khởi tạo sơ đồ thi đấu'}
          </Button>
          {!selectedDivisionId && (
            <p className="text-xs text-amber-600 font-semibold">⚠ Vui lòng chọn hình thức thi đấu trước</p>
          )}
          {participants.length < 2 && selectedDivisionId && (
            <p className="text-xs text-amber-600 font-semibold">⚠ Cần ít nhất 2 đội/VĐV để tạo bracket</p>
          )}
        </div>
      )}
      


      {/* Visual bracket tree — dùng lại BracketTab đã có, truyền onScheduleMatch cho organizer */}
      {bracket && bracket.stages && bracket.stages.length > 0 && (
        <PublicBracketTab
          tournament={tournament}
          divisionId={selectedDivisionId || undefined}
          onScheduleMatch={handleOpenScheduling}
        />
      )}
    </div>
  );
}
