'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { tournamentsApi } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { X, Users } from 'lucide-react';
import { useAuthStore } from '@/lib/zustand/authStore';
import { useRouter } from 'next/navigation';

interface Props {
  tournamentId: string;
  tournamentName: string;
  entryFee: number;
  matchType?: string;
  isRanked?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterModal({ tournamentId, tournamentName, entryFee, matchType, isRanked = false, isOpen, onClose }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const translate = useTranslations('Common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerEmailOrPhone, setPartnerEmailOrPhone] = useState('');
  const [rankingConsent, setRankingConsent] = useState(false);

  const isDoubles = matchType === 'DOUBLES' || matchType === 'MIXED_DOUBLES';

  if (!isOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      toast.error(translate('loginToRegister'));
      window.location.assign(`/login?redirect=/tournaments/${tournamentId}`);
      return;
    }

    if (isRanked && !rankingConsent) {
      toast.error(translate('rankingConsentRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      const teamName = user?.fullName || translate('player');
      const payload: { teamName: string; partnerEmailOrPhone?: string; rankingConsent: boolean } = { teamName, rankingConsent };
      if (isDoubles && partnerEmailOrPhone.trim()) {
        payload.partnerEmailOrPhone = partnerEmailOrPhone.trim();
      }

      const res = await tournamentsApi.register(tournamentId, payload);
      const participantId = res?.data?.participant?.id;
      const payableEntryFee = Number(res?.data?.entryFee ?? entryFee);
      
      if (isDoubles && partnerEmailOrPhone.trim()) {
        toast.success(translate('partnerInviteSent'), { duration: 5000 });
      } else {
        toast.success(translate('registrationSuccess'));
      }
      onClose();
      
      if (payableEntryFee > 0 && participantId) {
        router.push(`/payments/checkout?participantId=${participantId}&tournamentId=${tournamentId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> {translate('registerForTournament')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-5">
            {translate('registerDescription')} <strong className="text-slate-900">{tournamentName}</strong>.
          </p>
          
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-semibold mb-0.5">{translate('registeredAthleteCaptain')}</p>
                <p className="text-base font-bold text-slate-900">{user?.fullName || translate('notUpdated')}</p>
                <p className="text-xs text-slate-500 mt-0.5">{translate('accountNameAuto')}</p>
              </div>
            </div>

            {isDoubles && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{translate('partnerLabel')}</label>
                <input
                  type="text"
                  placeholder="{translate('partnerPlaceholder')}"
                  value={partnerEmailOrPhone}
                  onChange={(e) => setPartnerEmailOrPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-md border border-amber-200 leading-snug">
                  ⏱️ <strong>{translate('pairingDeadline')}:</strong> Hệ thống giữ chỗ tối đa <strong>1 giờ</strong> hoặc đến khi đóng đăng ký, tùy mốc nào đến trước. Đồng đội cần xác nhận trước thời hạn đó.
                </p>
              </div>
            )}
            
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-lg">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                * Lưu ý: Lệ phí tham gia sẽ được thông báo ở bước tiếp theo nếu có. Bằng việc đăng ký, bạn đồng ý với các điều khoản của Ban tổ chức.
              </p>
            </div>

            {isRanked && (
              <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rankingConsent}
                  onChange={(event) => setRankingConsent(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-sky-600"
                />
                <span>{translate('rankingConsentLabel')} trên bảng xếp hạng.</span>
              </label>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-600">
                {translate('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {isSubmitting ? translate('processing') : translate('confirmRegistration')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
