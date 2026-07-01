'use client';

import { useEffect, useState } from 'react';
import { Division, Tournament, divisionsApi } from '@/features/tournaments/api';
import { Button } from '@/components/ui/Button';
import { Calendar, MapPin, Users, Trophy, Share2, AlertCircle, User, Phone, Mail, Globe } from 'lucide-react';
import Link from 'next/link';
import OverviewTab from './components/OverviewTab';
import TeamsTab from './components/TeamsTab';
import BracketTab from './components/BracketTab';
import MatchesTab from './components/MatchesTab';
import RegisterModal from './components/RegisterModal';
import { useAuthStore } from '@/lib/zustand/authStore';
import GalleryCarousel from '@/components/ui/GalleryCarousel';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDate } from '@/utils/format';

interface Props {
  tournament: Tournament;
}

type TournamentDetailTab = 'overview' | 'prizes' | 'teams' | 'bracket' | 'matches';

const TOURNAMENT_DETAIL_TABS: TournamentDetailTab[] = [
  'overview',
  'prizes',
  'teams',
  'bracket',
  'matches',
];

export default function TournamentDetailClient({ tournament }: Props) {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [divisionsList, setDivisionsList] = useState<Division[]>([]);
  const selectedDivision: Tournament = (() => {
    if (!selectedDivisionId) {
      return tournament;
    }

    const division = divisionsList.find((item) => item.id === selectedDivisionId);
    if (!division) {
      return tournament;
    }

    return {
      ...tournament,
      id: tournament.id,
      name: division.name || tournament.name,
      matchType: division.matchType,
      genderRestriction: division.genderRestriction ?? null,
      format: division.bracketType ?? tournament.format,
      prizeDescription: division.prizeDescription ?? tournament.prizeDescription,
      status: tournament.status,
      maxParticipants: division.maxParticipants ?? tournament.maxParticipants,
      entryFee: division.entryFee ?? tournament.entryFee,
      _count: {
        ...(tournament._count || { matches: 0, participants: 0 }),
        participants: division._count?.participants ?? 0,
      },
    };
  })();
  const activeTournament = selectedDivision;

  const isOwner = !!user?.id && user.id === activeTournament.organizerId;
  const [activeTab, setActiveTab] = useState<TournamentDetailTab>('overview');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const isRegistrationLocked = activeTournament.isRegistrationLocked;
  const isRegistrationExpired = activeTournament.registrationEndDate ? new Date() > new Date(activeTournament.registrationEndDate) : false;
  const isRegistrationOpen = activeTournament.status === 'REGISTRATION_OPEN';

  let registrationButtonLabel = 'Đăng ký ngay';
  let isRegistrationButtonDisabled = false;

  if (isRegistrationOpen) {
    if (isRegistrationLocked) {
      registrationButtonLabel = 'Đã khóa đăng ký';
      isRegistrationButtonDisabled = true;
    } else if (isRegistrationExpired) {
      registrationButtonLabel = 'Hết hạn đăng ký';
      isRegistrationButtonDisabled = true;
    }
  } else if (['UPCOMING', 'REGISTRATION_CLOSED'].includes(activeTournament.status)) {
    registrationButtonLabel = 'Đã đóng đăng ký';
    isRegistrationButtonDisabled = true;
  } else if (['ONGOING', 'IN_PROGRESS'].includes(activeTournament.status)) {
    registrationButtonLabel = 'Đang diễn ra';
    isRegistrationButtonDisabled = true;
  } else if (activeTournament.status === 'COMPLETED') {
    registrationButtonLabel = 'Đã kết thúc';
    isRegistrationButtonDisabled = true;
  } else if (activeTournament.status === 'CANCELLED') {
    registrationButtonLabel = 'Đã hủy';
    isRegistrationButtonDisabled = true;
  } else {
    isRegistrationButtonDisabled = true;
    registrationButtonLabel = 'Chưa mở đăng ký';
  }

  useEffect(() => {
    const loadParentAndDivisions = async () => {
      try {
        const divisionsRes = await divisionsApi.getDivisions(tournament.id);
        const requestedDivisionId = searchParams.get('divisionId');
        if (divisionsRes.data && divisionsRes.data.length > 0) {
          setDivisionsList(divisionsRes.data);
          const preferredDivision = requestedDivisionId
            ? divisionsRes.data.find((division) => division.id === requestedDivisionId)
            : null;
          const nextDivisionId = preferredDivision?.id ?? divisionsRes.data[0].id;
          Promise.resolve().then(() => {
            setSelectedDivisionId((currentDivisionId) =>
              currentDivisionId === nextDivisionId ? currentDivisionId : nextDivisionId,
            );
          });
        } else {
          Promise.resolve().then(() => {
            setSelectedDivisionId((currentDivisionId) =>
              currentDivisionId === '' ? currentDivisionId : '',
            );
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load parent/divisions context:', err);
      }
    };
    loadParentAndDivisions();
  }, [searchParams, tournament]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (!requestedTab || !TOURNAMENT_DETAIL_TABS.includes(requestedTab as TournamentDetailTab)) {
      return;
    }

    if (activeTab !== requestedTab) {
      Promise.resolve().then(() => {
        setActiveTab(requestedTab as TournamentDetailTab);
      });
    }
  }, [activeTab, searchParams]);

  const participantCount = selectedDivision ? (selectedDivision._summary?.participantCount ?? selectedDivision._count?.participants ?? 0) : 0;
  const maxParticipants = selectedDivision ? (selectedDivision.maxParticipants ?? 0) : 0;
  const percentageFilled = maxParticipants > 0 ? Math.min(100, Math.round((participantCount / maxParticipants) * 100)) : 0;
  const registerHref = selectedDivisionId
    ? `/tournaments/${activeTournament.id}/register?divisionId=${selectedDivisionId}`
    : `/tournaments/${activeTournament.id}/register`;

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) return 'Chưa cập nhật';
    const sStr = start ? formatDate(start) : '...';
    const eStr = end ? formatDate(end) : '...';
    return `${sStr} - ${eStr}`;
  };

  const tabs: { id: TournamentDetailTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'prizes', label: 'Giải thưởng' },
    { id: 'teams', label: 'Đội tham gia' },
    { id: 'bracket', label: 'Bảng đấu' },
    { id: 'matches', label: 'Lịch thi đấu' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Banner Carousel Showcase */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pt-4 md:pt-6">
        <div className="relative w-full h-auto rounded-2xl md:rounded-3xl overflow-hidden shadow-xl">
          <GalleryCarousel 
            images={activeTournament.galleryImages && activeTournament.galleryImages.length > 0 ? activeTournament.galleryImages : []} 
            defaultBanner={activeTournament.bannerUrl || undefined}
            className="w-full h-auto"
          />
          
          {/* Only name inside banner, at bottom-left */}
          <div className="absolute bottom-4 left-6 md:bottom-6 md:left-8 z-10 space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 drop-shadow-sm tracking-wide uppercase truncate">
              {activeTournament.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Info Panel below banner */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 mt-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full md:w-auto">
            {activeTournament.logoUrl && (
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl p-1.5 flex items-center justify-center border border-slate-200 shadow-md flex-shrink-0">
                <img 
                  src={activeTournament.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            )}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-md border shadow-sm ${
                  (activeTournament.status === 'UPCOMING' || activeTournament.status === 'REGISTRATION_OPEN') ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  (activeTournament.status === 'ONGOING' || activeTournament.status === 'IN_PROGRESS') ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse' :
                  activeTournament.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  {activeTournament.status === 'UPCOMING' ? 'SẮP DIỄN RA' : 
                   activeTournament.status === 'REGISTRATION_OPEN' ? 'MỞ ĐĂNG KÝ' :
                   activeTournament.status === 'REGISTRATION_CLOSED' ? 'ĐÓNG ĐĂNG KÝ' :
                   (activeTournament.status === 'ONGOING' || activeTournament.status === 'IN_PROGRESS') ? 'ĐANG DIỄN RA' : 
                   activeTournament.status === 'COMPLETED' ? 'ĐÃ KẾT THÚC' : 
                   activeTournament.status === 'CANCELLED' ? 'ĐÃ HỦY' : 
                   activeTournament.status === 'DRAFT' ? 'BẢN NHÁP' : activeTournament.status}
                </span>
                <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 shadow-sm flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-500" /> 
                  {activeTournament.format === 'SINGLE_ELIMINATION' ? 'LOẠI TRỰC TIẾP' : 
                   activeTournament.format === 'DOUBLE_ELIMINATION' ? 'NHÁNH THẮNG/THUA' : 
                   activeTournament.format === 'ROUND_ROBIN' ? 'VÒNG TRÒN' : activeTournament.format}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {activeTournament.startDate ? (
                    <>
                      {formatDate(activeTournament.startDate)}
                      {activeTournament.endDate && ` - ${formatDate(activeTournament.endDate)}`}
                    </>
                  ) : 'Chưa thiết lập ngày'}
                </span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {activeTournament.locationAddress || 'Chưa cập nhật địa điểm'}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> {participantCount} / {maxParticipants || '∞'} Đội</span>
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-3 w-full md:w-auto items-center justify-start md:justify-end">
            <Button variant="outline" className="bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 flex-1 md:flex-none font-bold shadow-sm">
              <Share2 className="w-4 h-4 mr-2" /> Chia sẻ
            </Button>
            {!isOwner && activeTournament.status !== 'DRAFT' && (
              <Button 
                disabled={isRegistrationButtonDisabled}
                className={`${
                  isRegistrationButtonDisabled 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200 hover:bg-slate-200' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/10'
                } font-bold flex-1 md:flex-none shadow-sm`}
                onClick={() => {
                  if (!isRegistrationButtonDisabled) {
                    const needsRegistrationPage = activeTournament.visibility === 'PRIVATE' || 
                                                  activeTournament.tournamentConfig?.registrationMode === 'INVITE_ONLY' ||
                                                  divisionsList.length > 0;
                    if (needsRegistrationPage) {
                      router.push(registerHref);
                    } else {
                      setIsRegisterModalOpen(true);
                    }
                  }
                }}
              >
                {registrationButtonLabel}
              </Button>
            )}
            {isOwner && activeTournament.status !== 'DRAFT' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center flex-1 md:flex-none shadow-sm">
                <p className="text-xs text-slate-600 font-bold whitespace-nowrap">
                  Bạn là chủ sở hữu
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Area - Tabs & Content (takes 3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-2 no-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-slate-200/60 text-slate-600 hover:bg-slate-300/60 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 min-h-[500px]">
              {/* Division selector inside tab card */}
              {divisionsList.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-6 gap-3">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-900 text-sm">Nội dung thi đấu</h3>
                    <p className="text-[11px] text-slate-400 font-bold">Chọn phân hạng hoặc hình thức thi đấu để xem chi tiết</p>
                  </div>
                  <select
                    value={selectedDivisionId}
                    onChange={(e) => setSelectedDivisionId(e.target.value)}
                    disabled={false}
                    className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs h-10 w-full sm:w-60 shadow-sm cursor-pointer"
                  >
                    {divisionsList.map((div) => (
                      <option key={div.id} value={div.id}>
                        {div.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDivision ? (
                <>
                  {activeTab === 'overview' && <OverviewTab tournament={selectedDivision} />}
                  {activeTab === 'prizes' && (
                    <div className="prose prose-slate max-w-none text-slate-800 text-base leading-relaxed editorjs-content-view">
                      {selectedDivision.prizeDescription ? (
                        <div dangerouslySetInnerHTML={{ __html: selectedDivision.prizeDescription }} />
                      ) : (
                        <p className="italic text-slate-400 text-center">Ban tổ chức chưa cập nhật cơ cấu giải thưởng cho giải đấu này.</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'teams' && (
                    <TeamsTab tournament={selectedDivision} tournamentId={tournament.id} divisionId={selectedDivisionId || undefined} />
                  )}
                  {activeTab === 'bracket' && (
                    <BracketTab tournament={selectedDivision} tournamentId={tournament.id} divisionId={selectedDivisionId || undefined} />
                  )}
                  {activeTab === 'matches' && (
                    <MatchesTab tournament={selectedDivision} tournamentId={tournament.id} divisionId={selectedDivisionId || undefined} />
                  )}
                </>
              ) : (
                <p className="text-center text-slate-400 italic py-12">Không tìm thấy dữ liệu phân hạng.</p>
              )}
            </div>
          </div>

          {/* Right Area - Registration & Info Card (takes 1 col) */}
          <div className="lg:col-span-1 lg:sticky lg:top-6">
            <div className="bg-white rounded-2xl border border-slate-250/80 p-6 flex flex-col gap-6 shadow-sm">
              {/* Entry Fee */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Lệ phí tham gia</span>
                <div className="text-2xl font-black text-emerald-600">
                  {selectedDivision?.entryFee && selectedDivision.entryFee > 0 
                    ? `${Number(selectedDivision.entryFee).toLocaleString('vi-VN')} VNĐ` 
                    : 'Miễn phí'}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Lệ phí đóng khi đăng ký</p>
              </div>

              {/* Organizer Info */}
              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Ban tổ chức</span>
                <div className="flex items-center gap-3">
                  {activeTournament.organizer?.avatarUrl ? (
                    <img
                      src={activeTournament.organizer.avatarUrl}
                      alt={activeTournament.organizer?.fullName || 'BTC'}
                      className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                      <User className="w-5 h-5 text-indigo-500" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-slate-900 font-bold text-sm">{activeTournament.organizer?.fullName || 'Ban Tổ Chức'}</p>
                      {activeTournament.organizer?.isTrusted ? (
                        <span className="inline-flex items-center text-[9px] font-extrabold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md" title="Ban tổ chức uy tín">
                          👑 Uy Tín
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[9px] font-extrabold bg-slate-100 text-slate-650 px-1.5 py-0.2 rounded-md" title="BTC Mới">
                          🔰 Mới Tạo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">Người sáng lập giải đấu</p>
                  </div>
                </div>
              </div>

              {/* Slots Progress Bar */}
              {maxParticipants > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                    <span className="text-slate-500 uppercase tracking-wider">Số lượng đội</span>
                    <span className="text-slate-800">{participantCount} / {maxParticipants}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentageFilled >= 90 ? 'bg-rose-500' : percentageFilled >= 70 ? 'bg-amber-500' : 'bg-indigo-650'
                      }`}
                      style={{ width: `${percentageFilled}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Đã điền đầy {percentageFilled}% tổng số slots trống</p>
                </div>
              )}

              {/* Registration Period */}
              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Thời gian đăng ký</span>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-450 mt-0.5 shrink-0" />
                  <div className="text-xs font-semibold text-slate-700 leading-normal">
                    {formatDateRange(activeTournament.registrationStartDate, activeTournament.registrationEndDate)}
                  </div>
                </div>
              </div>

              {/* Warnings and Info Banners */}
              {isRegistrationOpen && isRegistrationLocked && (
                <div className="bg-amber-50 border border-amber-250/60 rounded-xl p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-800 leading-normal">
                    Giải đấu đã tạm ngưng nhận đăng ký mới từ Ban tổ chức.
                  </p>
                </div>
              )}
              {isRegistrationOpen && isRegistrationExpired && (
                <div className="bg-rose-50 border border-rose-250/60 rounded-xl p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-800 leading-normal">
                    Hạn đăng ký giải đấu đã kết thúc.
                  </p>
                </div>
              )}

              {/* Action Button */}
              {!isOwner && activeTournament.status !== 'DRAFT' && (
                <div className="mt-1 block w-full">
                  {isRegistrationButtonDisabled ? (
                    <Button disabled className="w-full bg-slate-100 text-slate-400 font-bold py-2.5 rounded-xl border border-slate-200 text-sm cursor-not-allowed">
                      {registrationButtonLabel}
                    </Button>
                  ) : (
                    <Link href={registerHref} className="block w-full">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md cursor-pointer text-sm">
                        Đăng ký ngay
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {isOwner && activeTournament.status !== 'DRAFT' && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mt-1 text-center">
                  <p className="text-xs text-slate-800 font-bold">
                    Bạn là quản trị viên giải đấu
                  </p>
                  <Link href={`/organizer/tournaments/${activeTournament.id}/manage`} className="mt-1.5 block text-xs text-blue-600 font-bold hover:underline">
                    Quản lý sơ đồ & lịch thi đấu
                  </Link>
                </div>
              )}
            </div>

            {/* Contact Info Card */}
            {activeTournament.contactInfo && (
              <div className="bg-white rounded-2xl border border-slate-250/80 p-6 flex flex-col gap-2.5 shadow-sm mt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Thông tin liên hệ</span>
                {activeTournament.contactInfo.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-450 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700">{activeTournament.contactInfo.phone}</span>
                  </div>
                )}
                {activeTournament.contactInfo.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-450 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">{activeTournament.contactInfo.email}</span>
                  </div>
                )}
                {Object.entries(activeTournament.contactInfo)
                  .filter(([key]) => key !== 'phone' && key !== 'email')
                  .map(([key, val]) => {
                    if (!val) return null;
                    const displayLabel = key.charAt(0).toUpperCase() + key.slice(1);
                    const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
                    return (
                      <div key={key} className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-slate-450 shrink-0" />
                        <span className="text-xs font-bold text-slate-500">{displayLabel}:</span>
                        {isUrl ? (
                          <a href={val as string} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline truncate">
                            {val}
                          </a>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700 truncate">{val}</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>
      </div>
      
      <RegisterModal 
        tournamentId={activeTournament.id} 
        tournamentName={activeTournament.name} 
        entryFee={selectedDivision ? (Number(selectedDivision.entryFee) || 0) : 0}
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
      />
    </div>
  );
}
