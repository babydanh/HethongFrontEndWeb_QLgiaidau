'use client';

import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { divisionsApi, type CreateDivisionInput, type Division } from '@/features/tournaments/api';
import { MatchTypeDB, GenderRestriction } from '@/types/tournament';
import { Layers, Plus, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateDivisionInlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  onDivisionCreated?: (newDivision: Division) => void;
}

export function CreateDivisionInlineModal({
  isOpen,
  onClose,
  tournamentId,
  onDivisionCreated,
}: CreateDivisionInlineModalProps) {
  const [name, setName] = useState('');
  const [matchFormat, setMatchFormat] = useState<'DOUBLES' | 'SINGLES' | 'MIXED'>('DOUBLES');
  const [bracketType, setBracketType] = useState<
    'SINGLE_ELIMINATION' | 'ROUND_ROBIN' | 'DOUBLE_ELIMINATION'
  >('SINGLE_ELIMINATION');
  const [maxParticipants, setMaxParticipants] = useState<number>(16);
  const [entryFee, setEntryFee] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên nội dung thi đấu');
      return;
    }

    let matchType = MatchTypeDB.DOUBLES;
    let genderRestriction: GenderRestriction | null = null;

    if (matchFormat === 'SINGLES') {
      matchType = MatchTypeDB.SINGLES;
    } else if (matchFormat === 'MIXED') {
      matchType = MatchTypeDB.MIXED_DOUBLES;
      genderRestriction = GenderRestriction.MIXED;
    }

    const payload: CreateDivisionInput = {
      name: name.trim(),
      matchType,
      genderRestriction,
      bracketType,
      maxParticipants: maxParticipants > 0 ? maxParticipants : null,
      entryFee: entryFee > 0 ? entryFee : 0,
    };

    try {
      setIsSubmitting(true);
      const res = await divisionsApi.createDivision(tournamentId, payload);
      toast.success('Đã tạo nội dung thi đấu thành công!');
      if (res.data && onDivisionCreated) {
        onDivisionCreated(res.data);
      }
      setName('');
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể tạo nội dung thi đấu';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
        <ModalHeader className="mb-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Layers className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">
              Nội dung thi đấu
            </span>
          </div>
          <ModalTitle className="text-lg font-bold text-slate-900">
            Thêm nội dung thi đấu mới
          </ModalTitle>
          <ModalDescription className="text-xs text-slate-500">
            Khởi tạo nhanh nội dung thi đấu với preset Lite tiêu chuẩn.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên nội dung <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Đôi nam phong trào, Đơn nữ Open..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Thể thức đánh
              </label>
              <select
                value={matchFormat}
                onChange={(e) => setMatchFormat(e.target.value as typeof matchFormat)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="DOUBLES">Đánh đôi (Doubles)</option>
                <option value="SINGLES">Đánh đơn (Singles)</option>
                <option value="MIXED">Đôi nam nữ (Mixed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Sơ đồ thi đấu
              </label>
              <select
                value={bracketType}
                onChange={(e) => setBracketType(e.target.value as typeof bracketType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="SINGLE_ELIMINATION">Loại trực tiếp (Knockout)</option>
                <option value="ROUND_ROBIN">Vòng tròn (Round Robin)</option>
                <option value="DOUBLE_ELIMINATION">Nhánh thắng/thua</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Số lượng tối đa
              </label>
              <input
                type="number"
                min={2}
                max={128}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Lệ phí (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                step={10000}
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 text-xs text-blue-800 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              Preset nhanh chuẩn Lite: Các quy tắc điểm số, bàn giao trận đấu sẽ áp dụng theo cấu hình mặc định của giải. Bạn có thể tinh chỉnh sâu trong Quản lý nâng cao.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-bold h-9 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs font-bold h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Tạo nội dung
                </>
              )}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
