'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const translate = useTranslations('Match');
  const commonTranslate = useTranslations('Common');

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="sm:max-w-md bg-white rounded-lg p-0">
        <ModalHeader className="p-6 pb-2">
          <ModalTitle className="text-xl font-semibold text-center">
            {translate('communityTournamentCreateButton')}
          </ModalTitle>
          <p className="text-sm text-slate-500 text-center mt-1">
            {translate('tournamentTypeChoiceSubtitle')}
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
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {translate('communityTournamentLiteLabel')}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {translate('communityTournamentLiteDescription')}
              </p>
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
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                {translate('communityTournamentFullLabel')}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {translate('communityTournamentFullDescription')}
              </p>
            </div>
          </button>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
          >
            {commonTranslate('cancel')}
          </button>
        </div>
      </ModalContent>
    </Modal>
  );
}

