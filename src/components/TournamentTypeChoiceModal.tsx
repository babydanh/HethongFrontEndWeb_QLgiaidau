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
      <ModalContent className="sm:max-w-md bg-white rounded-xl p-0">
        <ModalHeader className="p-5 pb-2">
          <ModalTitle className="text-xl font-semibold text-center">
            {translate('communityTournamentCreateButton')}
          </ModalTitle>
          <p className="text-sm text-slate-500 text-center mt-1">
            {translate('tournamentTypeChoiceSubtitle')}
          </p>
        </ModalHeader>

        <div className="p-5 pt-3 space-y-2.5">
          {/* Unified club session: free play or bracket */}
          <button
            onClick={() => {
              router.push(`/communities/${communityId}/match-sessions/create`);
              onClose();
            }}
            className="w-full rounded-lg border border-slate-200 p-3 text-left hover:border-teal-400 hover:shadow-sm transition-all group bg-white"
          >
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                {translate('communitySocialMatchButton')}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {translate('communitySocialMatchDescription')}
              </p>
            </div>
          </button>

          {/* Public quick option */}
          <button
            onClick={() => {
              router.push(`/organizer/tournaments/create?communityId=${communityId}`);
              onClose();
            }}
            className="w-full rounded-lg border border-slate-200 p-3 text-left hover:border-blue-400 hover:shadow-sm transition-all group bg-white"
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

        <div className="px-5 pb-5">
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

