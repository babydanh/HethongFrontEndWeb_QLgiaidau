'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Community, communitiesApi } from '@/features/communities/api';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

interface JoinCommunityModalProps {
  community: Community;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function JoinCommunityModal({ community, isOpen, onClose, onSuccess }: JoinCommunityModalProps) {
  const translate = useTranslations('CommunityJoin');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = community.joinQuestions || [];

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // If it requires approval and has questions, validate them
      if (community.joinMode === 'APPROVAL' && questions.length > 0) {
        const missing = questions.find(q => !answers[q] || answers[q].trim() === '');
        if (missing) {
          toast.error(translate('missingAnswer'));
          return;
        }
      }

      await communitiesApi.joinCommunity(community.id, answers);
      
      if (community.joinMode === 'APPROVAL') {
        toast.success(translate('approvalSuccess'));
      } else {
        toast.success(translate('joinSuccess'));
      }
      
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <ModalContent className="sm:max-w-[425px] bg-white rounded-lg">
        <ModalHeader>
          <ModalTitle className="text-xl font-semibold">
            {community.joinMode === 'APPROVAL' ? translate('requestTitle') : translate('confirmTitle')}
          </ModalTitle>
        </ModalHeader>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{community.name}</h3>
            {community.joinMode === 'APPROVAL' && (
              <p className="text-sm text-slate-500 mt-1">
                {translate('approvalDescription')}
              </p>
            )}
          </div>

          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {q} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    rows={2}
                    value={answers[q] || ''}
                    onChange={e => setAnswers({ ...answers, [q]: e.target.value })}
                    placeholder={translate('answerPlaceholder')}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-600">
              {community.joinMode === 'APPROVAL' 
                                ? translate('approvalConfirm')
                : translate('directConfirm')}
            </div>
          )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {translate('cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            isLoading={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {community.joinMode === 'APPROVAL' ? translate('submitRequest') : translate('joinNow')}
          </Button>
        </div>
      </div>
      </ModalContent>
    </Modal>
  );
}

