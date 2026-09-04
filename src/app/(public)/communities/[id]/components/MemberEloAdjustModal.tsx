'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EloTierBadge } from '@/components/ui/EloTierBadge';
import { getRankStyle } from '@/utils/rank-style';
import { getShortTierCode } from '@/components/ui/PlayerSportTierBadgeBar';
import { Plus, Minus, Edit3, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export type EloOperation = 'ADD' | 'SUBTRACT' | 'SET';

export interface MemberEloAdjustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    userId: string;
    fullName: string;
    currentElo?: number | null;
  } | null;
  categoryName?: string;
  isSaving?: boolean;
  onConfirm: (data: {
    userId: string;
    operation: EloOperation;
    points: number;
    reason: string;
  }) => Promise<void>;
}

export default function MemberEloAdjustModal({
  open,
  onOpenChange,
  member,
  categoryName = 'Pickleball',
  isSaving = false,
  onConfirm,
}: MemberEloAdjustModalProps) {
  const [operation, setOperation] = useState<EloOperation>('ADD');
  const [amount, setAmount] = useState<string>('25');
  const [reason, setReason] = useState<string>('');

  const currentElo = member?.currentElo ?? 1200;
  const numAmount = Math.max(0, parseInt(amount, 10) || 0);

  // Tính ELO dự kiến sau khi áp dụng thao tác
  let previewElo = currentElo;
  if (operation === 'ADD') {
    previewElo = currentElo + numAmount;
  } else if (operation === 'SUBTRACT') {
    previewElo = Math.max(0, currentElo - numAmount);
  } else if (operation === 'SET') {
    previewElo = numAmount;
  }

  // Lấy rank style cho ELO hiện tại và dự kiến
  const currentRank = getRankStyle(currentElo, undefined, categoryName);
  const currentShort = getShortTierCode(currentRank.name, currentElo);

  const previewRank = getRankStyle(previewElo, undefined, categoryName);
  const previewShort = getShortTierCode(previewRank.name, previewElo);

  const isTierChanged = currentShort !== previewShort;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    if (operation === 'SET' && numAmount < 0) {
      toast.error('Điểm ELO không thể nhỏ hơn 0');
      return;
    }
    if ((operation === 'ADD' || operation === 'SUBTRACT') && numAmount <= 0) {
      toast.error('Vui lòng nhập số điểm thay đổi lớn hơn 0');
      return;
    }
    if (!reason.trim()) {
      toast.error('Vui lòng nhập lý do điều chỉnh ELO (để lưu lịch sử minh bạch)');
      return;
    }

    await onConfirm({
      userId: member.userId,
      operation,
      points: numAmount,
      reason: reason.trim(),
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl">
        <ModalHeader className="space-y-1.5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Edit3 className="w-4 h-4" />
            </span>
            <ModalTitle className="text-base font-bold text-slate-900">
              Điều phối ELO thành viên
            </ModalTitle>
          </div>
          <ModalDescription className="text-xs text-slate-500">
            Cập nhật điểm ELO cho{' '}
            <strong className="text-slate-800 font-semibold">{member?.fullName}</strong>.
            Hệ thống tự động xếp hạng rank (HT/LT).
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Operation Selector: Thêm / Bớt / Sửa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Thao tác ELO
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setOperation('ADD');
                  if (operation === 'SET') setAmount('25');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  operation === 'ADD'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Thêm (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOperation('SUBTRACT');
                  if (operation === 'SET') setAmount('25');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  operation === 'SUBTRACT'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Minus className="w-3.5 h-3.5" /> Bớt (-)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOperation('SET');
                  setAmount(String(currentElo));
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  operation === 'SET'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Đặt mới (=)
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {operation === 'SET' ? 'Điểm ELO mới' : 'Số điểm ELO điều chỉnh'}
              </label>
              {operation !== 'SET' && (
                <div className="flex gap-1">
                  {[10, 25, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(String(val))}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      {operation === 'ADD' ? `+${val}` : `-${val}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number"
              min="0"
              max="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={operation === 'SET' ? '1200' : '25'}
              className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
            />
          </div>

          {/* Real-time Rank Preview Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Xem trước xếp hạng sau điều chỉnh:
            </p>
            <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-2xs">
              <div className="flex items-center gap-2">
                <EloTierBadge
                  elo={currentElo}
                  categoryName={categoryName}
                  size="sm"
                  showFullName={false}
                />
                <span className="font-mono text-xs font-bold text-slate-600">
                  {currentElo}
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[11px] font-mono">
                  {operation === 'ADD' && `+${numAmount}`}
                  {operation === 'SUBTRACT' && `-${numAmount}`}
                  {operation === 'SET' && `➔`}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-2">
                <EloTierBadge
                  elo={previewElo}
                  categoryName={categoryName}
                  size="sm"
                  showFullName={false}
                />
                <span
                  className={`font-mono text-xs font-black ${
                    previewElo > currentElo
                      ? 'text-emerald-600'
                      : previewElo < currentElo
                        ? 'text-rose-600'
                        : 'text-slate-800'
                  }`}
                >
                  {previewElo}
                </span>
              </div>
            </div>

            {isTierChanged && (
              <p className="text-[11px] font-medium text-amber-700 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Hạng tự động đổi từ{' '}
                <strong>{currentRank.name}</strong> sang{' '}
                <strong>{previewRank.name}</strong>.
              </p>
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Lý do điều phối <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Kiểm tra trình độ nội bộ, Thắng giao hữu, Đạt giải tuần..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
            />
          </div>

          <ModalFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Xác nhận cập nhật
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
