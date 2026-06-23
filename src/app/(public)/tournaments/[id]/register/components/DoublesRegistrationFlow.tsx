'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi, Tournament, TournamentParticipant } from '@/features/tournaments/api';
import { usersApi, UserProfile } from '@/features/users/api';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatCurrency } from '@/utils/format';
import { Copy, Check, Loader2, QrCode, Users, CreditCard, CheckCircle, AlertTriangle, ArrowRight, Trash2, Search, UserMinus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  tournament: Tournament;
  inviteCode?: string;
  divisionId?: string;
}

export default function DoublesRegistrationFlow({ tournament, inviteCode, divisionId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [teamName, setTeamName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participant, setParticipant] = useState<TournamentParticipant | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Partner search states
  const [partnerQuery, setPartnerQuery] = useState('');
  const [searchedPartner, setSearchedPartner] = useState<UserProfile | null>(null);
  const [isSearchingPartner, setIsSearchingPartner] = useState(false);
  const [partnerSearchError, setPartnerSearchError] = useState('');
  const [inviteLater, setInviteLater] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (step !== 2 || !participant?.registeredAt) return;

    const intervalId = setInterval(() => {
      const regTime = new Date(participant.registeredAt).getTime();
      const endTime = regTime + 2 * 60 * 60 * 1000; // 2 hours
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeLeft('Đã hết hạn 2 giờ');
        clearInterval(intervalId);
        tournamentsApi.getMyRegistration(tournament.id).then((res) => {
          if (!res.data?.registered) {
            setParticipant(null);
            setStep(1);
            toast.error('Đơn đăng ký của bạn đã bị hủy do quá hạn 2 giờ.');
          }
        });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const hStr = hours > 0 ? `${hours} giờ ` : '';
        setTimeLeft(`${hStr}${minutes} phút ${seconds} giây`);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [step, participant?.registeredAt, tournament.id]);

  // Check if user already has an active registration when component mounts
  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const res = await tournamentsApi.getMyRegistration(tournament.id);
        if (res.data && res.data.registered && res.data.participant) {
          const part = res.data.participant;
          setParticipant(part);
          if (part.teamStatus === 'PENDING') {
            setStep(2);
          } else if (part.teamStatus === 'COMPLETE') {
            setStep(3);
          }
        }
      } catch (err) {
        console.error('Lỗi kiểm tra đăng ký:', err);
      }
    };
    checkRegistration();
  }, [tournament.id]);

  // Polling for teammate to join during Step 2
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (step === 2 && participant?.id) {
      if (!isPolling) {
        Promise.resolve().then(() => setIsPolling(true));
      }
      intervalId = setInterval(async () => {
        try {
          const res = await tournamentsApi.getMyRegistration(tournament.id);
          if (res.data && res.data.registered && res.data.participant) {
            const part = res.data.participant;
            if (part.teamStatus === 'COMPLETE') {
              setParticipant(part);
              setStep(3);
              toast.success('Đồng đội của bạn đã tham gia đội thành công!', { id: 'partner-joined' });
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error('Lỗi khi kiểm tra trạng thái đội:', err);
        }
      }, 3000);
    } else {
      if (isPolling) {
        Promise.resolve().then(() => setIsPolling(false));
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, participant?.id, tournament.id, isPolling]);

  const handleSearchPartner = async () => {
    const q = trimAndNormalizeSpaces(partnerQuery);
    if (!q) {
      setPartnerSearchError('Vui lòng nhập Email hoặc Số điện thoại để tìm kiếm.');
      return;
    }
    try {
      setIsSearchingPartner(true);
      setPartnerSearchError('');
      const res = await usersApi.searchUsersByQuery(q);
      const results = res || [];
      if (Array.isArray(results) && results.length > 0) {
        setSearchedPartner(results[0]);
      } else {
        setSearchedPartner(null);
        setPartnerSearchError('Không tìm thấy người dùng này trên hệ thống. Đồng đội của bạn phải tạo tài khoản trước.');
      }
    } catch (err) {
      console.error(err);
      setPartnerSearchError('Lỗi khi tìm kiếm người dùng.');
    } finally {
      setIsSearchingPartner(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = trimAndNormalizeSpaces(teamName);
    if (cleanName.length < 3) {
      toast.error('Tên đội phải chứa ít nhất 3 ký tự');
      return;
    }

    if (!inviteLater && !searchedPartner) {
      toast.error('Vui lòng tìm kiếm và xác nhận đồng đội hoặc chọn "Mời đồng đội sau"');
      return;
    }

    try {
      setIsSubmitting(true);
      const partnerEmailOrPhone = inviteLater ? undefined : (searchedPartner?.email || searchedPartner?.phoneNumber || partnerQuery);
      const res = await tournamentsApi.register(tournament.id, {
        teamName: cleanName,
        inviteCode,
        partnerEmailOrPhone,
        tournamentDivisionId: divisionId,
      });

      if (res.data) {
        const part = res.data.participant;
        setParticipant(part);
        toast.success(partnerEmailOrPhone ? 'Đăng ký ghép cặp thành công!' : 'Tạo đội thành công! Bây giờ hãy gửi link mời đồng đội.');
        if (part.teamStatus === 'COMPLETE') {
          setStep(3);
        } else {
          setStep(2);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualCheck = async () => {
    try {
      toast.loading('Đang kiểm tra trạng thái...', { id: 'manual-check' });
      const res = await tournamentsApi.getMyRegistration(tournament.id);
      if (res.data && res.data.registered && res.data.participant) {
        const part = res.data.participant;
        setParticipant(part);
        if (part.teamStatus === 'COMPLETE') {
          setStep(3);
          toast.success('Đồng đội của bạn đã tham gia!', { id: 'manual-check' });
        } else {
          toast.error('Vẫn chưa có đồng đội nào tham gia.', { id: 'manual-check' });
        }
      } else {
        toast.error('Có lỗi xảy ra khi kiểm tra đăng ký.', { id: 'manual-check' });
      }
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'manual-check' });
    }
  };

  // Bank refund form modal states for doubles
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankError, setBankError] = useState('');

  const handleWithdrawClick = async () => {
    if (participant?.isPaid && Number(tournament.entryFee) > 0) {
      try {
        const freshProfile = await usersApi.getProfile();
        const profile = (freshProfile as any).data || freshProfile;
        setBankName(profile?.bankName || '');
        setBankAccountNumber(profile?.bankAccountNumber || '');
        setBankAccountName(profile?.bankAccountName || '');
      } catch (err) {
        console.error('Failed to load profile for bank autofill:', err);
      }
      setBankError('');
      setShowWithdrawModal(true);
    } else {
      if (confirm('Bạn có chắc chắn muốn hủy đăng ký và rút lui khỏi giải đấu?')) {
        executeWithdraw();
      }
    }
  };

  const executeWithdraw = async (bankData?: { bankName: string; bankAccountNumber: string; bankAccountName: string }) => {
    try {
      setIsWithdrawing(true);
      await tournamentsApi.withdraw(tournament.id, bankData);
      toast.success('Đã rút khỏi giải đấu thành công.');
      setParticipant(null);
      setTeamName('');
      setStep(1);
      setShowWithdrawModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleConfirmWithdrawWithBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      setBankError('Vui lòng điền đầy đủ thông tin ngân hàng.');
      return;
    }
    executeWithdraw({
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase(),
    });
  };

  const handlePayment = () => {
    if (!participant?.id) return;
    router.push(`/payments/checkout?participantId=${participant.id}&tournamentId=${tournament.id}`);
  };

  const partnerLink = participant?.teamInviteToken
    ? `${window.location.origin}/tournaments/${tournament.id}/join-team?pid=${participant.id}&token=${participant.teamInviteToken}`
    : '';

  const qrImageUrl = partnerLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(partnerLink)}`
    : '';

  const copyToClipboard = () => {
    if (!partnerLink) return;
    navigator.clipboard.writeText(partnerLink);
    setCopied(true);
    toast.success('Đã sao chép link mời đồng đội!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Progress Tracker */}
      <div className="flex items-center justify-between max-w-md mx-auto bg-white border rounded-xl p-4 shadow-sm text-xs font-bold text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>1</span>
          <span className={step === 1 ? 'text-blue-600 font-extrabold' : ''}>Tạo Đội</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>2</span>
          <span className={step === 2 ? 'text-blue-600 font-extrabold' : ''}>Mời Đồng Đội</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>3</span>
          <span className={step === 3 ? 'text-blue-600 font-extrabold' : ''}>Thanh Toán / Hoàn Tất</span>
        </div>
      </div>

      {/* STEP 1: CREATE TEAM */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Bước 1: Khởi tạo thông tin đội
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Giải đấu này thuộc thể thức thi đấu{' '}
              <strong>
                {tournament.genderRestriction === 'MIXED'
                  ? 'Đôi Nam Nữ (Mixed Doubles)'
                  : tournament.genderRestriction === 'FEMALE'
                  ? 'Đôi Nữ (Female Doubles)'
                  : 'Đôi Nam (Male Doubles)'}
              </strong>
              . Bạn là người đại diện đăng ký đội trưởng (Leader).
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex gap-3 text-xs leading-relaxed font-semibold">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Lưu ý giới hạn thời gian (2 giờ)</p>
              <p className="mt-1">
                Đồng đội của bạn cần xác nhận tham gia và hoàn tất thanh toán lệ phí trong vòng <strong>2 giờ</strong> kể từ lúc tạo đội, nếu không hệ thống sẽ tự động hủy đơn đăng ký của đội để nhường chỗ cho các đội khác.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTeam} className="space-y-5">
            <Input
              label="Tên đội thi đấu"
              placeholder="Ví dụ: Song Hùng Hà Nội"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isSubmitting}
            />

            {/* Checkbox: Invite Later */}
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="inviteLater"
                checked={inviteLater}
                onChange={(e) => {
                  setInviteLater(e.target.checked);
                  if (e.target.checked) {
                    setSearchedPartner(null);
                    setPartnerSearchError('');
                  }
                }}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="inviteLater" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                Tôi muốn mời đồng đội sau (qua link mời / mã QR)
              </label>
            </div>

            {/* Partner Search Form (only if not inviting later) */}
            {!inviteLater && (
              <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-4">
                <span className="text-xs font-black text-slate-600 uppercase tracking-wider block">Thông tin đồng đội</span>
                
                {searchedPartner ? (
                  // Display verified partner profile
                  <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-emerald-300 bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm uppercase overflow-hidden">
                        {searchedPartner.avatarUrl ? (
                          <img src={searchedPartner.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          searchedPartner.fullName?.charAt(0) || 'TV'
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-950">{searchedPartner.fullName}</p>
                        <p className="text-[10px] text-emerald-700 font-semibold">{searchedPartner.email || searchedPartner.phoneNumber}</p>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSearchedPartner(null)}
                      className="border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs h-9 flex items-center gap-1.5 px-3 rounded-lg"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Hủy chọn
                    </Button>
                  </div>
                ) : (
                  // Display search input
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Email hoặc Số điện thoại đồng đội</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Nhập email hoặc số điện thoại..."
                          value={partnerQuery}
                          onChange={(e) => setPartnerQuery(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 h-11"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSearchPartner}
                        disabled={isSearchingPartner || !partnerQuery.trim()}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 h-11 shrink-0 flex items-center gap-1.5"
                      >
                        {isSearchingPartner ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        Tìm
                      </Button>
                    </div>
                    
                    {partnerSearchError && (
                      <p className="text-[11px] text-rose-600 font-semibold leading-normal flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                        <span>{partnerSearchError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fee summary block */}
            <div className="bg-slate-50 border border-slate-205 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-slate-500">Lệ phí cơ bản:</span>
                <span className="text-slate-800 font-bold">{Number(tournament.entryFee) > 0 ? formatCurrency(Number(tournament.entryFee)) : 'Miễn phí'} / người</span>
              </div>
              <div className="flex justify-between items-center font-extrabold text-sm border-t border-slate-200 pt-2.5">
                <span className="text-slate-700">Tổng lệ phí nộp (x2):</span>
                <span className="text-blue-700 font-black">
                  {Number(tournament.entryFee) > 0 ? formatCurrency(Number(tournament.entryFee) * 2) : 'Miễn phí'}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !teamName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý đăng ký...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {inviteLater ? 'Tạo đội & Lấy link mời' : 'Đăng ký & Ghép cặp'}
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* STEP 2: SHARE INVITE LINK & POLL */}
      {step === 2 && participant && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="space-y-1 text-center max-w-sm mx-auto">
            <h3 className="text-lg font-black text-slate-900">Bước 2: Mời đồng đội tham gia</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Đội <strong className="text-slate-800">{participant.teamName}</strong> đã được khởi tạo. Hãy chia sẻ link hoặc mã QR dưới đây cho đồng đội của bạn.
            </p>
          </div>

          {timeLeft && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center animate-in fade-in duration-300">
              <span className="text-[10px] font-bold text-rose-650 block uppercase tracking-wider">Thời gian còn lại để hoàn tất đội:</span>
              <span className="text-lg font-black text-rose-600 mt-1 block tracking-wider tabular-nums">{timeLeft}</span>
            </div>
          )}

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center bg-slate-50 border p-6 rounded-2xl max-w-xs mx-auto">
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="QR Code" className="w-44 h-44 object-contain bg-white p-2 rounded-xl border" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center bg-white border border-dashed rounded-xl">
                <QrCode className="w-12 h-12 text-slate-300" />
              </div>
            )}
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-3">Quét mã QR để tham gia đội</p>
          </div>

          {/* Share link input copy */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Đường dẫn tham gia đội của bạn</label>
            <div className="flex gap-2">
              <Input
                value={partnerLink}
                readOnly
                className="bg-slate-50 text-slate-650 cursor-default select-all text-xs"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="border-slate-205 hover:bg-slate-50 text-slate-700 shrink-0 flex items-center gap-1.5 font-bold h-11 mt-1"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Đã copy' : 'Sao chép'}
              </Button>
            </div>
          </div>

          {/* Polling Indicator */}
          <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-5 bg-blue-50/20 text-center space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang chờ đồng đội nhấp link và đồng ý tham gia...</span>
            </div>
            <p className="text-[10px] text-slate-400 max-w-xs">
              Màn hình này sẽ tự động chuyển tiếp khi đồng đội của bạn tham gia thành công.
            </p>
            <div className="flex items-center gap-3 w-full max-w-xs pt-2">
              <Button
                variant="outline"
                onClick={handleManualCheck}
                className="flex-1 text-slate-700 border-slate-200 hover:bg-slate-55 bg-white text-xs font-bold"
              >
                Kiểm tra thủ công
              </Button>
              <Button
                variant="outline"
                onClick={handleWithdrawClick}
                disabled={isWithdrawing}
                className="flex-1 text-rose-600 border-rose-100 hover:bg-rose-50 bg-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> {"Hủy & Rút lui"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PAYMENT / COMPLETE */}
      {step === 3 && participant && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Đăng ký đội thành công!</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              Đội của bạn đã tập hợp đủ 2 thành viên thi đấu chính thức.
            </p>
          </div>

          {/* Team Members List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y">
            <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Thành viên đội: {participant.teamName}
            </div>
            {participant.members?.map((m, idx: number) => (
              <div key={m.userId || idx} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                    {m.fullName?.substring(0, 2) || 'TV'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{m.fullName || 'Thành viên'}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{m.role === 'MAIN' ? 'Đội trưởng / Leader' : 'Thành viên / Partner'}</p>
                  </div>
                </div>
                <span className="text-xs font-black text-blue-650 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {m.elo?.eloPoints || 1000} ELO
                </span>
              </div>
            ))}
          </div>

          {/* Action Details */}
          {Number(tournament.entryFee || 0) > 0 ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Lệ phí giải đấu:</span>
                  <span className="text-slate-900 font-black">{formatCurrency(Number(tournament.entryFee))} / Đội</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Trạng thái nộp phí:</span>
                  {participant.isPaid ? (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Đã đóng</span>
                  ) : (
                    <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Chờ thanh toán</span>
                  )}
                </div>
              </div>

              {!participant.isPaid && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleWithdrawClick}
                    disabled={isWithdrawing}
                    className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Hủy & Rút lui
                  </Button>
                  <Button
                    onClick={handlePayment}
                    className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/10"
                  >
                    <CreditCard className="w-4 h-4" /> Tiến hành Thanh toán
                  </Button>
                </div>
              )}

              {participant.isPaid && (
                <Button
                  onClick={() => router.push(`/tournaments/${tournament.id}`)}
                  className="w-full bg-slate-900 hover:bg-slate-855 text-white font-bold py-3 text-sm"
                >
                  Xem trang giải đấu
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold p-4 rounded-xl text-center">
                Giải đấu này miễn phí lệ phí tham gia. Bạn đã hoàn tất toàn bộ quy trình đăng ký giải đấu!
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleWithdrawClick}
                  disabled={isWithdrawing}
                  className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> {"Hủy & Rút lui"}
                </Button>
                <Button
                  onClick={() => router.push(`/tournaments/${tournament.id}`)}
                  className="flex-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-sm"
                >
                  Truy cập trang giải đấu
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Hoàn Tiền Thủ Công cho Đánh Đôi */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-extrabold text-slate-900">Thông tin hoàn trả lệ phí đôi</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmWithdrawWithBank}>
              <div className="p-6 space-y-4.5">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-slate-650 leading-relaxed font-semibold">
                  Đội của bạn đã đăng ký nội dung có phí. Ban tổ chức sẽ hoàn trả lệ phí qua số tài khoản ngân hàng của Đội trưởng (người nộp lệ phí) dưới đây.
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tên ngân hàng / Ví (Ví dụ: MB Bank, Vietcombank...)</label>
                  <Input
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Nhập tên ngân hàng..."
                    className="font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số tài khoản ngân hàng</label>
                  <Input
                    required
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Nhập số tài khoản..."
                    className="font-bold text-slate-800 tracking-wider"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Họ và tên chủ tài khoản (Viết hoa không dấu)</label>
                  <Input
                    required
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="Ví dụ: NGUYEN VAN A"
                    className="font-bold text-slate-800 uppercase"
                  />
                </div>

                {bankError && (
                  <p className="text-xs font-bold text-rose-600 animate-pulse">{bankError}</p>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 border-slate-205 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isWithdrawing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-500/10"
                >
                  {isWithdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Xác nhận rút & hoàn tiền
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}