'use client';

import { useEffect, useState, use } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { communitiesApi, Community } from '@/features/communities/api';
import { challengesApi, CommunityChallenge } from '@/features/communities/challenges';
import {
  Trophy,
  Calendar,
  Users,
  Search,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ArrowRightLeft,
  Mail,
  Send,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

export default function ClubChallengesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [community, setCommunity] = useState<Community | null>(null);
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [allClubs, setAllClubs] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [challengeModalTarget, setChallengeModalTarget] = useState<Community | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [challengeMessage, setChallengeMessage] = useState('');
  const [challengeDate, setChallengeDate] = useState('');

  // Active sub-tab
  const [subTab, setSubTab] = useState<'received' | 'sent' | 'find-clubs'>('received');

  const fetchData = async () => {
    try {
      const cRes = await communitiesApi.getCommunityById(id);
      setCommunity(cRes.data || null);

      const chRes = await challengesApi.getChallenges(id);
      setChallenges(chRes.data || chRes || []);

      const listRes = await communitiesApi.getCommunities({ limit: 50 });
      if (listRes.data) {
        setAllClubs(listRes.data.filter((c: Community) => c.id !== id));
      }
    } catch (err) {
      toast.error('Không thể tải dữ liệu thách đấu giao lưu');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    init();
  }, [id]);

  const handleSendChallenge = async () => {
    if (!challengeModalTarget) return;

    try {
      setIsSubmitting(true);
      const data = {
        challengedId: challengeModalTarget.id,
        message: challengeMessage.trim() || undefined,
        scheduledAt: challengeDate ? new Date(challengeDate).toISOString() : undefined,
      };

      await challengesApi.createChallenge(id, data);
      toast.success(`Đã gửi lời mời thách đấu tới ${challengeModalTarget.name}!`);
      
      // Reset form
      setChallengeModalTarget(null);
      setChallengeMessage('');
      setChallengeDate('');

      // Refresh list
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (challengeId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      setIsLoading(true);
      await challengesApi.respondChallenge(id, challengeId, { status });
      toast.success(status === 'ACCEPTED' ? 'Đã chấp nhận thách đấu! Giải đấu giao hữu đã được tự động khởi tạo.' : 'Đã từ chối lời mời thách đấu.');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClubs = allClubs.filter((club) =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const receivedChallenges = challenges.filter((c) => c.challengedId === id);
  const sentChallenges = challenges.filter((c) => c.challengerId === id);

  const getStatusBadge = (status: CommunityChallenge['status']) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Đang chờ</Badge>;
      case 'ACCEPTED':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Chấp nhận</Badge>;
      case 'REJECTED':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Từ chối</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Đã hủy</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Đang tải thách đấu giao lưu...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy câu lạc bộ</h2>
          <p className="text-slate-500 mt-2">Đường dẫn không hợp lệ hoặc câu lạc bộ không tồn tại.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Back Link */}
        <Link href={`/communities/${community.id}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-6">
          <ChevronLeft className="w-4 h-4" /> Quay lại Câu lạc bộ
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-7 h-7 text-emerald-600" /> Thách Đấu / Giao Lưu CLB
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Gửi lời mời thách đấu giao hữu với các câu lạc bộ khác trên hệ thống. Tự động sinh giải đấu khi được đồng ý!
          </p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-8 bg-white p-1 rounded-xl shadow-sm border">
          <button
            onClick={() => setSubTab('received')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
              subTab === 'received' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" /> Thách đấu nhận được ({receivedChallenges.length})
          </button>
          <button
            onClick={() => setSubTab('sent')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
              subTab === 'sent' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" /> Lời mời đã gửi ({sentChallenges.length})
          </button>
          <button
            onClick={() => setSubTab('find-clubs')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
              subTab === 'find-clubs' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4" /> Tìm đối thủ
          </button>
        </div>

        {/* SUB TAB: RECEIVED CHALLENGES */}
        {subTab === 'received' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {receivedChallenges.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center">
                <Mail className="w-8 h-8 text-slate-350 mb-2" />
                <p className="text-slate-500 text-sm font-medium">Chưa nhận được lời thách đấu giao lưu nào.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedChallenges.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      {/* Logo of challenger */}
                      <div className="w-12 h-12 rounded-full border overflow-hidden bg-slate-50 relative shrink-0">
                        <img src={c.challengerLogoUrl || "/vndcsport.svg"} alt="Challenger" className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-base">Lời mời từ: {c.challengerName}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Giao lưu dự kiến: {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString('vi-VN') : 'Chưa thiết lập'}
                          </span>
                        </div>
                        {c.message && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                            <span>&ldquo;{c.message}&rdquo;</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                      {c.status === 'PENDING' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleRespond(c.id, 'REJECTED')}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs px-4"
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRespond(c.id, 'ACCEPTED')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 shadow-sm"
                          >
                            Đồng ý
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          {getStatusBadge(c.status)}
                          {c.status === 'ACCEPTED' && c.tournamentId && (
                            <Link href={`/organizer/tournaments/${c.tournamentId}/manage`}>
                              <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-bold text-xs flex items-center gap-1">
                                <ExternalLink className="w-3.5 h-3.5" /> Quản lý giải giao hữu
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB TAB: SENT CHALLENGES */}
        {subTab === 'sent' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {sentChallenges.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center">
                <Send className="w-8 h-8 text-slate-350 mb-2" />
                <p className="text-slate-500 text-sm font-medium">Bạn chưa gửi lời mời thách đấu nào.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentChallenges.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      {/* Logo of challenged */}
                      <div className="w-12 h-12 rounded-full border overflow-hidden bg-slate-50 relative shrink-0">
                        <img src={c.challengedLogoUrl || "/vndcsport.svg"} alt="Challenged" className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-base">Gửi tới CLB: {c.challengedName}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Giao lưu dự kiến: {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString('vi-VN') : 'Chưa thiết lập'}
                          </span>
                        </div>
                        {c.message && (
                          <p className="text-xs text-slate-650 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                            &ldquo{c.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                      {getStatusBadge(c.status)}
                      {c.status === 'ACCEPTED' && c.tournamentId && (
                        <Link href={`/organizer/tournaments/${c.tournamentId}/manage`}>
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-bold text-xs flex items-center gap-1">
                            <ExternalLink className="w-3.5 h-3.5" /> Quản lý giải giao hữu
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB TAB: FIND CLUBS (FACEBOOK-STYLE DIRECTORY) */}
        {subTab === 'find-clubs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search filter */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm câu lạc bộ theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm"
              />
            </div>

            {filteredClubs.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-sm font-medium">Không tìm thấy câu lạc bộ nào phù hợp.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClubs.map((club) => (
                  <div
                    key={club.id}
                    className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center gap-4"
                  >
                    <div className="flex gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full border overflow-hidden bg-slate-50 relative shrink-0">
                        <img src={club.logoUrl || "/vndcsport.svg"} alt={club.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{club.name}</h4>
                        <p className="text-xs text-slate-550 truncate">{club.locationAddress || 'Chưa cập nhật địa điểm'}</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setChallengeModalTarget(club)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 shrink-0 shadow-sm"
                    >
                      Thách đấu
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* CHALLENGE INVITATION MODAL */}
      {challengeModalTarget && (
        <Modal open={!!challengeModalTarget} onOpenChange={(open) => { if (!open) setChallengeModalTarget(null); }}>
          <ModalContent className="bg-white rounded-2xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Gửi lời mời thách đấu tới {challengeModalTarget.name}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4">
              <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-lg text-emerald-950 text-xs font-semibold leading-relaxed">
                Lời mời thách đấu khi được chấp thuận sẽ tự động sinh ra một giải đấu giao hữu nội bộ, làm sân chơi chung cho thành viên cả 2 câu lạc bộ.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Lời nhắn thách đấu / Thể lệ giao lưu</label>
                <Textarea
                  placeholder="Ví dụ: Thân mời CLB giao hữu tennis đôi nam vào sáng thứ 7 tuần này tại sân CLB..."
                  value={challengeMessage}
                  onChange={(e) => setChallengeMessage(e.target.value)}
                  className="h-24 resize-none"
                />
              </div>

              <DateTimePicker
                label="Thời gian giao lưu dự kiến"
                value={challengeDate}
                onChange={setChallengeDate}
              />

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => setChallengeModalTarget(null)}
                  disabled={isSubmitting}
                  className="border-slate-200 text-slate-650 font-medium"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleSendChallenge}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi lời mời'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

    </div>
  );
}
