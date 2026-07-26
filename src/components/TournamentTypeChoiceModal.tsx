'use client';

import { useRouter } from 'next/navigation';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';

interface TournamentTypeChoiceModalProps {
  communityId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TournamentTypeChoiceModal({
  communityId,
  isOpen,
  onClose,
}: TournamentTypeChoiceModalProps) {
  const router = useRouter();

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="sm:max-w-md bg-white rounded-lg p-0">
        <ModalHeader className="p-6 pb-2">
          <ModalTitle className="text-xl font-semibold text-center">
            Tạo giải đấu cấp CLB
          </ModalTitle>
          <p className="text-sm text-slate-500 text-center mt-1">
            Chọn cách bạn muốn tạo giải đấu
          </p>
        </ModalHeader>

        <div className="p-6 pt-4 space-y-3">
          {/* Lite option */}
          <button
            onClick={() => {
              router.push(`/communities/${communityId}/create-lite`);
              onClose();
            }}
            className="w-full rounded-lg border border-slate-200 p-4 text-left hover:border-emerald-400 hover:shadow-sm transition-all group bg-white"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚡</span>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Lite — Tạo nhanh
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Tạo giải đấu nhanh chóng trong vài bước, phù hợp cho giải nội bộ
                </p>
              </div>
            </div>
          </button>

          {/* Advanced option */}
          <button
            onClick={() => {
              router.push(`/organizer/tournaments/create?communityId=${communityId}`);
              onClose();
            }}
            className="w-full rounded-lg border border-slate-200 p-4 text-left hover:border-blue-400 hover:shadow-sm transition-all group bg-white"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">🔧</span>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Nâng cao — Wizard 4 bước
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Cấu hình đầy đủ với 4 bước: giải đấu, bảng, thể thức và đăng ký
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
          >
            Hủy
          </button>
        </div>
      </ModalContent>
    </Modal>
  );
}
