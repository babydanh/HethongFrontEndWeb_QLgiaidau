'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trophy, Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { divisionsApi, tournamentsApi, Tournament, TournamentParticipant, type Division } from '@/features/tournaments/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { formatDate, formatCurrency } from '@/utils/format';
import { getSportLogo } from '@/constants/sports';
import toast from 'react-hot-toast';

export default function JoinTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const searchParams = useSearchParams();
  const participantId = searchParams.get('pid') || '';
  const teamInviteToken = searchParams.get('token') || '';
  const divisionId = searchParams.get('divisionId') || '';

  const { user, isAuthenticated } = useAuthStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participant, setParticipant] = useState<TournamentParticipant | null>(null);
  const [division, setDivision] = useState<Division | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildTournamentDetailHref = (tournamentId: string, effectiveDivisionId?: string | null) => {
    const params = new URLSearchParams();
    if (participantId) {
      params.set('pid', participantId);
    }
    if (teamInviteToken) {
      params.set('token', teamInviteToken);
    }
    if (effectiveDivisionId) {
      params.set('divisionId', effectiveDivisionId);
    }
    return `/tournaments/${tournamentId}${params.toString() ? `?${params.toString()}` : ''}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !participantId || !teamInviteToken) {
        toast.error('Thông tin lời mời tham gia đội không hợp lệ hoặc thiếu tham số.');
        router.push('/tournaments');
        return;
      }

      try {
        setIsLoading(true);
        // Fetch tournament
        const tRes = await tournamentsApi.getTournamentById(id, {
          ...(participantId ? { pid: participantId } : {}),
          ...(teamInviteToken ? { token: teamInviteToken } : {}),
        });
        if (tRes.data) {
          setTournament(tRes.data);
        }

        // Fetch participants to find the target team
        const pRes = await tournamentsApi.getTournamentParticipants(id);
        if (pRes.data) {
          const targetTeam = pRes.data.find(p => p.id === participantId);
          if (targetTeam) {
            setParticipant(targetTeam);
            const effectiveDivisionId = divisionId || targetTeam.tournamentDivisionId || '';
            if (effectiveDivisionId) {
              const divisionRes = await divisionsApi.getDivisions(id);
              if (divisionRes.data) {
                setDivision(divisionRes.data.find((item) => item.id === effectiveDivisionId) ?? null);
              }
            } else {
              setDivision(null);
            }
          } else {
            toast.error('Đội thi đấu không tồn tại hoặc đã bị hủy.');
            router.push(buildTournamentDetailHref(id, divisionId));
          }
        }
      } catch (err) {
        toast.error('Không thể tải thông tin lời mời.');
        router.push(buildTournamentDetailHref(id, divisionId));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, participantId, teamInviteToken, router]);

  const handleJoin = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Vui lòng đăng nhập để chấp nhận lời mời tham gia đội.');
      const params = new URLSearchParams({
        pid: participantId,
        token: teamInviteToken,
      });
      if (divisionId) {
        params.set('divisionId', divisionId);
      }
      const redirectUrl = `/tournaments/${id}/join-team?${params.toString()}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    // Client-side validation: Gender checks
    if (tournament?.genderRestriction) {
      const userGender = user.gender?.toUpperCase();
      const restriction = tournament.genderRestriction.toUpperCase();

      if (restriction === 'MALE' && userGender !== 'MALE') {
        toast.error('Giải đấu này chỉ dành cho Nam. Giới tính của bạn không phù hợp.');
        return;
      }
      if (restriction === 'FEMALE' && userGender !== 'FEMALE') {
        toast.error('Giải đấu này chỉ dành cho Nữ. Giới tính của bạn không phù hợp.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await tournamentsApi.joinTeam(id, {
        participantId,
        teamInviteToken,
      });

      toast.success('Gia nhập đội thi đấu thành công!');

      const entryFee = Number((division?.entryFee ?? tournament?.entryFee) || 0);
      const effectiveDivisionId = divisionId || participant?.tournamentDivisionId || '';

      if (entryFee > 0) {
        const params = new URLSearchParams({
          participantId,
          tournamentId: id,
          pid: participantId,
          token: teamInviteToken,
        });
        if (effectiveDivisionId) {
          params.set('divisionId', effectiveDivisionId);
        }
        router.push(`/payments/checkout?${params.toString()}`);
      } else {
        const params = new URLSearchParams({
          pid: participantId,
          token: teamInviteToken,
        });
        if (effectiveDivisionId) {
          params.set('divisionId', effectiveDivisionId);
        }
        router.push(`/tournaments/${id}?${params.toString()}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium text-sm">Đang tải thông tin đội bóng...</p>
      </div>
    );
  }

  if (!tournament || !participant) return null;

  const isLocked = tournament.isRegistrationLocked;
  const isExpired = tournament.registrationEndDate ? new Date() > new Date(tournament.registrationEndDate) : false;
  const isNotOpen =
    tournament.status !== 'REGISTRATION_OPEN' &&
    tournament.status !== 'UPCOMING' &&
    tournament.status !== 'DRAFT';

  if (isLocked || isExpired || isNotOpen) {
    let title = 'Đăng ký đã đóng';
    let message = 'Giải đấu hiện không nhận đăng ký mới.';
    if (isLocked) {
      title = 'Đăng ký đã khóa';
      message = 'Giải đấu đã tạm ngưng nhận đăng ký mới từ Ban tổ chức.';
    } else if (isExpired) {
      title = 'Đăng ký hết hạn';
      message = 'Hạn đăng ký giải đấu này đã kết thúc.';
    }

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-slate-550 text-xs leading-relaxed font-semibold">{message}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(buildTournamentDetailHref(tournament.id, divisionId || participant.tournamentDivisionId || ''))}
            className="w-full border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-bold"
          >
            Quay lại trang giải đấu
          </Button>
        </div>
      </div>
    );
  }

  const leader = participant.members?.find(m => m.role === 'MAIN') || participant.members?.[0];
  const isTeamFull = participant.members?.length >= 2;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.push(buildTournamentDetailHref(tournament.id, divisionId || participant.tournamentDivisionId || ''))}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại giải đấu
        </button>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
            <span className="flex items-center gap-1 bg-blue-600/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider w-fit">
              {(() => {
                const logo = getSportLogo(tournament.category?.name);
                return logo ? (
                  <img src={logo} alt={tournament.category?.name || ''} className="w-3 h-3 object-contain" />
                ) : null;
              })()}
              {tournament.category?.name || 'Cầu Lông'}
            </span>
            <h1 className="text-xl md:text-2xl font-bold mt-2 mb-3 text-white">{tournament.name}</h1>

            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-350 font-semibold">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Khai mạc: {tournament.startDate ? formatDate(tournament.startDate) : 'Chưa xếp lịch'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span className="truncate">{tournament.locationAddress || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>

          {/* Invite Card Body */}
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2 max-w-sm mx-auto">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-105 text-blue-600 mb-1">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Lời mời tham gia đấu đôi</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                Bạn được mời gia nhập đội <strong className="text-slate-800">{participant.teamName}</strong> tham gia giải đấu này.
              </p>
            </div>

            {/* Team Leader Profile */}
            {leader && (
              <div className="bg-slate-50 border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm uppercase">
                    {leader.fullName?.substring(0, 2) || 'LD'}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Trưởng nhóm (Leader)</p>
                    <p className="text-sm font-bold text-slate-800">{leader.fullName || 'Người dùng'}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {leader.elo?.eloPoints || 1000} ELO
                </span>
              </div>
            )}

            {/* Constraints warnings */}
            <div className="space-y-3">
              {tournament.genderRestriction && (
                <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 text-xs font-semibold p-3.5 rounded-lg border border-amber-200/50">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Yêu cầu giới tính</p>
                    <p className="mt-0.5 leading-relaxed text-slate-600 font-medium">
                      Giải đấu yêu cầu ràng buộc giới tính: {
                        tournament.genderRestriction === 'MALE' ? 'Chỉ Nam' :
                        tournament.genderRestriction === 'FEMALE' ? 'Chỉ Nữ' :
                        'Đôi Nam Nữ (1 Nam + 1 Nữ)'
                      }. Hệ thống sẽ đối chiếu giới tính hồ sơ của bạn.
                    </p>
                  </div>
                </div>
              )}

              {Number(tournament.entryFee || 0) > 0 && (
                <div className="flex items-start gap-2.5 bg-blue-50 text-blue-800 text-xs font-semibold p-3.5 rounded-lg border border-blue-200/50">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-950">Lệ phí giải đấu</p>
                    <p className="mt-0.5 leading-relaxed text-slate-650 font-medium">
                      Lệ phí tham gia: <strong className="text-slate-900">{formatCurrency(Number(tournament.entryFee))} / Đội</strong>.
                      Nếu chưa thanh toán, bạn hoặc trưởng nhóm sẽ cần đóng phí để xác nhận hoàn tất vị trí.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {isTeamFull ? (
              <div className="text-center py-4 bg-slate-50 border border-dashed rounded-lg text-slate-400 font-bold text-sm">
                Đội này đã đủ thành viên. Bạn không thể gia nhập.
              </div>
            ) : (
              <div className="space-y-3">
                {!isAuthenticated && (
                  <p className="text-xs text-amber-600 font-semibold text-center">
                    Bạn cần đăng nhập tài khoản để xác nhận chấp nhận lời mời.
                  </p>
                )}
                <Button
                  onClick={handleJoin}
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {!isAuthenticated ? 'Đăng nhập & Chấp nhận lời mời' : 'Đồng ý gia nhập đội'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
