'use client';

import { Minus, Plus, RotateCcw, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { cn } from '@/utils/cn';

type LiteSet = { team1: number; team2: number };

interface LiteScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team1Name: string;
  team2Name: string;
  sportLabel: string;
}

export function LiteScoreModal({
  open,
  onOpenChange,
  team1Name,
  team2Name,
  sportLabel,
}: LiteScoreModalProps) {
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [sets, setSets] = useState<LiteSet[]>([]);
  const [notice, setNotice] = useState('');

  const adjustScore = (team: 1 | 2, amount: number) => {
    setNotice('');
    if (team === 1) setTeam1Score((score) => Math.max(0, score + amount));
    else setTeam2Score((score) => Math.max(0, score + amount));
  };

  const commitSetPreview = () => {
    if (team1Score === team2Score) {
      setNotice('Hai đội cần có điểm khác nhau trước khi chốt set.');
      return;
    }
    setSets((current) => [...current, { team1: team1Score, team2: team2Score }]);
    setTeam1Score(0);
    setTeam2Score(0);
    setNotice('Set đã được chốt trong bản xem trước. Chưa đồng bộ lên trận.');
  };

  const undoLastSet = () => {
    setSets((current) => {
      const previous = current.at(-1);
      if (previous) {
        setTeam1Score(previous.team1);
        setTeam2Score(previous.team2);
      }
      return current.slice(0, -1);
    });
    setNotice('Đã hoàn tác set gần nhất trong bản xem trước.');
  };

  const resetPreview = () => {
    setTeam1Score(0);
    setTeam2Score(0);
    setSets([]);
    setNotice('Đã xóa toàn bộ điểm xem trước.');
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92vh] w-[95vw] max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl">
        <ModalHeader className="border-b border-slate-200 bg-white px-6 py-5 text-left">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <ModalTitle className="text-2xl font-bold text-slate-900">Bảng điểm Lite</ModalTitle>
              <ModalDescription className="mt-1 text-sm font-medium text-slate-500">
                Tự chấm điểm nhanh, không cần cấu hình trước. Đây là bản xem trước, chưa lưu vào trận.
              </ModalDescription>
            </div>
            <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {sportLabel} · Lite
            </span>
          </div>
        </ModalHeader>

        <div className="max-h-[calc(92vh-150px)] overflow-y-auto bg-slate-50 px-4 py-5 md:px-6">
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
            Người chấm tự quyết định điểm kết thúc set và số set. Hệ thống chỉ kiểm tra hai đội không hòa khi chốt set.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { team: 1 as const, name: team1Name, score: team1Score, tone: 'blue' },
              { team: 2 as const, name: team2Name, score: team2Score, tone: 'orange' },
            ].map(({ team, name, score, tone }) => (
              <section
                key={team}
                className={cn(
                  'rounded-2xl border p-5 text-center shadow-sm',
                  tone === 'blue' ? 'border-blue-200 bg-blue-50/70' : 'border-orange-200 bg-orange-50/70',
                )}
              >
                <h3 className="min-h-12 text-lg font-bold text-slate-900">{name}</h3>
                <div className={cn('my-3 text-6xl font-black', tone === 'blue' ? 'text-blue-600' : 'text-orange-600')}>
                  {score}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="icon" aria-label={`Trừ điểm ${name}`} onClick={() => adjustScore(team, -1)}>
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Button size="icon" aria-label={`Cộng điểm ${name}`} onClick={() => adjustScore(team, 1)}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Các set đã chốt</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{sets.length ? `${sets.length} set` : 'Chưa có set nào'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={undoLastSet} disabled={!sets.length}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Hoàn tác
                </Button>
                <Button variant="outline" onClick={resetPreview} disabled={!sets.length && !team1Score && !team2Score}>
                  Xóa bản xem trước
                </Button>
              </div>
            </div>
            {sets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sets.map((set, index) => (
                  <span key={`${set.team1}-${set.team2}-${index}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">
                    S{index + 1}: {set.team1} - {set.team2}
                  </span>
                ))}
              </div>
            )}
          </div>

          {notice && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{notice}</p>}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng bảng điểm</Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={commitSetPreview}>Chốt set xem trước</Button>
            <Button disabled title="API chốt trận sẽ được nối ở bước sau">
              <Trophy className="mr-2 h-4 w-4" /> Chốt trận (sắp có)
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
