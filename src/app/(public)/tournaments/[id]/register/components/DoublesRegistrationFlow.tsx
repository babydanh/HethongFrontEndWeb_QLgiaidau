'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi, Tournament, TournamentParticipant } from '@/features/tournaments/api';
import { getErrorMessage } from '@/utils/error';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { formatCurrency } from '@/utils/format';
import { Copy, Check, Loader2, QrCode, Users, CreditCard, CheckCircle, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  tournament: Tournament;
  inviteCode?: string;
}

export default function DoublesRegistrationFlow({ tournament, inviteCode }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [teamName, setTeamName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [participant, setParticipant] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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
      setIsPolling(true);
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
      setIsPolling(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, participant?.id, tournament.id]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = trimAndNormalizeSpaces(teamName);
    if (cleanName.length < 3) {
      toast.error('Tên đội phải chứa ít nhất 3 ký tự');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await tournamentsApi.register(tournament.id, {
        teamName: cleanName,
        inviteCode,
      });

      if (res.data) {
        setParticipant(res.data.participant);
        toast.success('Tạo đội thành công! Bây giờ hãy gửi link mời đồng đội.');
        setStep(2);
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

  const handleWithdraw = async () => {
    if (!confirm('Bạn có chắc chắn muốn hủy đăng ký và rút lui khỏi giải đấu? Nếu đã đóng lệ phí, việc hoàn trả sẽ cần được BTC giải quyết.')) {
      return;
    }

    try {
      setIsWithdrawing(true);
      await tournamentsApi.withdraw(tournament.id);
      toast.success('Đã rút khỏi giải đấu thành công.');
      setParticipant(null);
      setTeamName('');
      setStep(1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsWithdrawing(false);
    }
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="space-y-1 mb-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Bước 1: Đặt tên đội thi đấu
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Giải đấu này thuộc thể thức thi đấu Đôi ({tournament.genderRestriction === 'MIXED' ? 'Đôi Nam Nữ' : 'Đôi tự do'}). Bạn là người đại diện đăng ký đội trưởng (Leader).
            </p>
          </div>

          <form onSubmit={handleCreateTeam} className="space-y-5">
            <Input
              label="Tên đội"
              placeholder="Ví dụ: Đội Song Hùng Hà Nội"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isSubmitting}
            />

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 leading-relaxed font-semibold">
              * Sau khi tạo đội, hệ thống sẽ sinh ra một link mời đặc quyền. Bạn cần gửi link này cho đồng đội của bạn để họ nhấn vào và điền thông tin tham gia đội.
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !teamName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang khởi tạo đội...
                </>
              ) : (
                <>Tạo đội & Lấy link mời đồng đội</>
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
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="flex-1 text-rose-600 border-rose-100 hover:bg-rose-50 bg-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hủy & Rút lui
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
            {participant.members?.map((m: any, idx: number) => (
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
                    onClick={handleWithdraw}
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
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 text-sm"
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
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="flex-1 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-3 text-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Hủy & Rút lui
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
    </div>
  );
}
