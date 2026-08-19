'use client';

import { use, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { DateTimePicker } from '@/components/ui/Input';
import { Calendar, AlertTriangle, ExternalLink, Plus, X, Loader2, Trash2, Lock, Trophy, Settings, DollarSign, FileText, User, Users, Video, Zap, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';
import { getSportLogo } from '@/constants/sports';
import { useManageState } from './components/useManageState';
import { TournamentStepper } from './components/TournamentStepper';
import { BasicInfoTab } from './components/BasicInfoTab';
import { ScheduleTab } from './components/ScheduleTab';
import { RegistrationTab } from './components/RegistrationTab';
import { BracketTab } from './components/BracketTab';
import { FinanceTab } from './components/FinanceTab';
import { PermissionsTab } from './components/PermissionsTab';
import { LivestreamTab } from './components/LivestreamTab';
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { getScoreEntryGuidance, getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import { resolveSportRuleView } from '@/features/tournaments/sport-rules/normalize';
import { isTournamentRegistrationClosed } from '@/utils/tournament-status';

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-bold text-slate-800 text-right">{value}</span>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function getDivisionGenderMeta(div: { name: string; matchType?: string | null; genderRestriction?: string | null }) {
  const nameLower = (div.name || '').toLowerCase();
  const gender = (div.genderRestriction || '').toUpperCase();
  const isDoubles = (div.matchType || '').toUpperCase().includes('DOUBLE') || nameLower.includes('đôi');
  
  if (nameLower.includes('nam nữ') || nameLower.includes('hỗn hợp') || gender === 'MIXED') {
    return {
      badgeText: isDoubles ? 'Đôi Nam Nữ' : 'Nam Nữ',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
      iconBoxClass: 'bg-purple-100/70 text-purple-600 border-purple-200',
      isDoubles: true,
    };
  }
  if (nameLower.includes('nữ') || gender === 'FEMALE') {
    return {
      badgeText: isDoubles ? 'Đôi Nữ' : 'Đơn Nữ',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
      iconBoxClass: 'bg-rose-100/70 text-rose-600 border-rose-200',
      isDoubles,
    };
  }
  if (nameLower.includes('nam') || gender === 'MALE') {
    return {
      badgeText: isDoubles ? 'Đôi Nam' : 'Đơn Nam',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
      iconBoxClass: 'bg-sky-100/70 text-sky-600 border-sky-200',
      isDoubles,
    };
  }
  return {
    badgeText: isDoubles ? 'Đôi' : 'Đơn',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    iconBoxClass: 'bg-slate-100 text-slate-600 border-slate-200',
    isDoubles,
  };
}

export default function TournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const s = useManageState(id);
  const bracketSectionRef = useRef<HTMLDivElement | null>(null);
  const sportPresets = getSportRulePresets(s.sportRuleKind);
  const selectedDivision = s.divisions.find((d) => d.id === s.selectedDivisionId);
  const lockRuleView = resolveSportRuleView(selectedDivision?.roundConfig, s.sportRuleKind);

  if (s.isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Đang tải cấu hình quản trị...</p>
      </div>
    </div>
  );
  const pendingRefereeCount = s.referees.filter((ref) => ref.status === 'INVITED').length;
  const sportPresentation = getSportRulePresentation(s.sportRuleKind);
  const supportsTiebreakInput = s.sportRuleKind === 'TENNIS' || s.sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const isPickleballSideOut = s.sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const scoreGuidance = getScoreEntryGuidance(s.sportRuleKind);


  if (!s.tournament) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
      <div className="max-w-md bg-white p-8 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Không tìm thấy giải đấu</h2>
        <p className="text-slate-500 mt-2">Giải đấu không tồn tại hoặc bạn không có quyền truy cập quản trị.</p>
      </div>
    </div>
  );

  const tournament = s.tournament;

  const TABS = [
    { key: 'basic', label: 'Thông tin', icon: Settings },
    { key: 'schedule', label: 'Lịch & Địa điểm', icon: Calendar },
    { key: 'registration', label: 'Đăng ký', icon: Users },
    { key: 'bracket', label: 'Sơ đồ', icon: Trophy },
    { key: 'livestream', label: 'Camera', icon: Video },
    { key: 'finance', label: 'Tài chính', icon: DollarSign },
    { key: 'permissions', label: 'Phân quyền', icon: FileText },
  ] as const;

  const buildPublicTournamentUrl = (tab?: 'bracket') => {
    const params = new URLSearchParams();

    if (tab) {
      params.set('tab', tab);
    }

    if (s.selectedDivisionId) {
      params.set('divisionId', s.selectedDivisionId);
    }

    const query = params.toString();
    return `/tournaments/${tournament.id}${query ? `?${query}` : ''}`;
  };

  const handleOpenManageBracket = () => {
    if (s.activeTab !== 'bracket') {
      s.setActiveTab('bracket');
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bracketSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-8 px-3 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 md:p-6 mb-4 md:mb-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {getSportLogo(s.tournament.category?.name) && <img src={getSportLogo(s.tournament.category?.name)!} alt="" className="w-3 h-3 object-contain" />}
                {s.tournament.category?.name || 'Bộ môn'}
              </span>
              {s.getStatusLabel(s.tournament.status)}
              {s.draftStatus === 'saving' && <span className="text-[10px] font-semibold text-slate-400">Đang lưu nháp…</span>}
              {s.draftStatus === 'saved' && <span className="text-[10px] font-semibold text-emerald-600">Đã lưu nháp</span>}
              {s.draftStatus === 'restored' && <span className="text-[10px] font-semibold text-amber-600">Đã khôi phục nháp</span>}
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-slate-900">{s.tournament.name}</h1>
            <p className="text-slate-500 font-medium text-xs md:text-sm flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Khai mạc: {s.tournament.startDate ? formatDate(s.tournament.startDate) : 'Chưa thiết lập'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 w-full md:w-auto">
            <Button
              onClick={() => { window.location.href = `/organizer/tournaments/${tournament.id}/ops`; }}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 font-bold text-[11px] md:text-sm h-8 md:h-10 px-3 md:px-4"
            >
              Vận hành
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenManageBracket}
              className="border-slate-200 bg-slate-50 text-slate-600 hover:bg-amber-100 flex items-center gap-1 font-bold text-[11px] md:text-sm h-8 md:h-10 px-3 md:px-4"
            >
              <Trophy className="w-3.5 h-3.5" /> Bracket
            </Button>
            <Button variant="outline" onClick={() => window.open(buildPublicTournamentUrl(), '_blank')} className="border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 font-bold text-[11px] md:text-sm h-8 md:h-10 px-3 md:px-4">
              <ExternalLink className="w-3.5 h-3.5" /> Trang giải
            </Button>
          </div>
        </div>

        <TournamentStepper tournament={s.tournament} onPublish={s.publishFeeAmount > 0 ? s.handlePayPublishFee : s.handlePublish}
          onNextStep={s.handleTournamentStepTransition} publishFeeAmount={s.publishFeeAmount} isLoading={s.isLoading || s.isPayingPublishFee}
          onOpenTournament={s.handleConfirmOpen} isOpening={s.isOpening}
          isEndModalOpen={s.isEndModalOpen} setIsEndModalOpen={s.setIsEndModalOpen}
          handleConfirmEnd={s.handleConfirmEnd} isEnding={s.isEnding} endChecklist={s.endChecklist}
                    participants={s.participants} divisions={s.divisions} matches={s.matches} />

        {/* Divisions Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Nội dung thi đấu</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {s.divisions.length}/20
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Chọn nội dung để xem và cấu hình chi tiết</p>
            </div>
            <Button
              size="sm"
              onClick={() => { s.resetDivisionEditor(); s.setIsCreateDivisionModalOpen(true); }}
              disabled={s.divisions.length >= 20 || isTournamentRegistrationClosed(s.tournament.status) || s.tournament.isRegistrationLocked || ['IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(s.tournament.status)}
              className="font-bold text-xs flex items-center gap-1.5 h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap disabled:opacity-50"
              title={s.divisions.length >= 20 ? 'Đã đạt giới hạn tối đa 20 nội dung' : 'Thêm nội dung thi đấu'}
            >
              <Plus className="w-3.5 h-3.5" />
              {s.divisions.length >= 20 ? 'Đạt tối đa (20/20)' : 'Thêm nội dung'}
            </Button>
          </div>
          {s.divisions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {s.divisions.map(div => {
                const isActive = div.id === s.selectedDivisionId;
                const bracketFormatLabel = s.getBracketLabel(div.bracketType);
                const genderMeta = getDivisionGenderMeta(div);
                const IconComponent = genderMeta.isDoubles ? Users : User;

                return (
                  <div
                    key={div.id}
                    className={`group relative flex items-stretch justify-between rounded-lg border transition-all duration-150 ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/40 text-slate-900 shadow-xs ring-1 ring-blue-600/30'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <button 
                      type="button" 
                      onClick={() => { s.setSelectedDivisionId(div.id); s.applyDivisionFormValues(div); }}
                      className="flex items-start gap-2.5 p-2.5 text-left cursor-pointer flex-1 min-w-0"
                      title="Nhấn để xem chi tiết & thiết lập cấu hình riêng"
                    >
                      {/* Icon Avatar */}
                      <div
                        className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 border mt-0.5 ${genderMeta.iconBoxClass}`}
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className={`block truncate text-xs font-bold tracking-tight ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>
                            {div.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${genderMeta.badgeClass}`}
                          >
                            {genderMeta.badgeText}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 truncate">
                            {bracketFormatLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                          <span>Tối đa: <strong className="text-slate-700 font-semibold">{div.maxParticipants ?? 'Theo giải'}</strong></span>
                          <span>•</span>
                          <span>{div.minElo != null || div.maxElo != null ? `ELO ${div.minElo ?? 0}–${div.maxElo ?? '∞'}` : 'ELO theo giải'}</span>
                        </div>
                      </div>
                    </button>

                    {/* Action buttons (Edit / Delete) */}
                    <div className="flex flex-col justify-between border-l border-slate-100 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button" 
                        onClick={() => s.openDivisionEditor(div)}
                        disabled={!s.tournament || isTournamentRegistrationClosed(s.tournament?.status ?? '') || s.tournament?.isRegistrationLocked || ['IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(s.tournament?.status ?? '')}
                        className="p-1 rounded transition-colors cursor-pointer text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Chỉnh sửa nội dung"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        type="button" 
                        onClick={() => { s.requestDeleteDivision(div); }}
                        className="p-1 rounded transition-colors cursor-pointer text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Xóa nội dung này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs nav */}
        <div className="overflow-x-auto mb-6 bg-white rounded-lg border border-slate-200 shadow-sm hide-scrollbar">
          <div className="flex md:grid md:grid-cols-7 gap-1.5 p-1.5 min-w-max md:min-w-0">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => s.setActiveTab(key)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  s.activeTab === key ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
                {key === 'permissions' && pendingRefereeCount > 0 ? (
                  <span className={`inline-flex min-w-[18px] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    s.activeTab === key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {pendingRefereeCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {s.activeTab === 'basic' && <BasicInfoTab id={id} tournament={s.tournament} categories={s.categories}
          validationField={s.validationField}
          basicSubTab={s.basicSubTab} setBasicSubTab={s.setBasicSubTab}
          name={s.name} setName={s.setName} categoryId={s.categoryId} setCategoryId={s.setCategoryId}
          description={s.description} setDescription={s.setDescription}
          logoUrl={s.logoUrl} setLogoUrl={s.setLogoUrl} bannerUrl={s.bannerUrl} setBannerUrl={s.setBannerUrl}
          hideFeaturedCardText={s.hideFeaturedCardText} setHideFeaturedCardText={s.setHideFeaturedCardText}
          newGalleryUrl={s.newGalleryUrl} setNewGalleryUrl={s.setNewGalleryUrl}
          isAddingImage={s.isAddingImage} setIsAddingImage={s.setIsAddingImage}
          prizeDescription={s.prizeDescription} setPrizeDescription={s.setPrizeDescription}
          contactInfo={s.contactInfo} setContactInfo={s.setContactInfo}
          isSavingConfig={s.isSavingConfig} isDeleting={s.isDeleting}
          handleDeleteTournament={s.handleDeleteTournament} handleSaveBasicInfo={s.handleSaveBasicInfo}
          fetchTournamentData={s.fetchTournamentData}
          divisions={s.divisions} selectedDivisionId={s.selectedDivisionId}
          isLimitEnabled={s.isLimitEnabled} setIsLimitEnabled={s.setIsLimitEnabled}
          maxParticipants={s.maxParticipants} setMaxParticipants={s.setMaxParticipants}
          matchType={s.matchType} setMatchType={s.setMatchType}
          setsToWin={s.setsToWin} setSetsToWin={s.setSetsToWin}
          pointsPerSet={s.pointsPerSet} setPointsPerSet={s.setPointsPerSet}
          winByTwo={s.winByTwo} setWinByTwo={s.setWinByTwo} />}

        {s.activeTab === 'schedule' && <ScheduleTab tournament={s.tournament} bracket={s.bracket} venues={s.venues}
          validationField={s.validationField}
          customVenueName={s.customVenueName} setCustomVenueName={s.setCustomVenueName}
          customVenueAddress={s.customVenueAddress} setCustomVenueAddress={s.setCustomVenueAddress}
          provinceCode={s.provinceCode} setProvinceCode={s.setProvinceCode}
          wardCode={s.wardCode} setWardCode={s.setWardCode}
          provinces={s.provinces} wards={s.wards} setWards={s.setWards}
          startDate={s.startDate} setStartDate={s.setStartDate}
          endDate={s.endDate} setEndDate={s.setEndDate}
          isSavingConfig={s.isSavingConfig} handleSaveScheduleDetails={s.handleSaveScheduleDetails} />}

        {s.activeTab === 'registration' && <RegistrationTab tournament={s.tournament}
          inviteLink={s.inviteLink}
          mockNamesText={s.mockNamesText} setMockNamesText={s.setMockNamesText}
          isSeedingMock={s.isSeedingMock} isClearingMock={s.isClearingMock}
          wildcardEmailOrPhone={s.wildcardEmailOrPhone} setWildcardEmailOrPhone={s.setWildcardEmailOrPhone}
          wildcardTeamName={s.wildcardTeamName} setWildcardTeamName={s.setWildcardTeamName}
          wildcardPartnerEmailOrPhone={s.wildcardPartnerEmailOrPhone} setWildcardPartnerEmailOrPhone={s.setWildcardPartnerEmailOrPhone}
          isAssigningWildcard={s.isAssigningWildcard}
          divisions={s.divisions} selectedDivisionId={s.selectedDivisionId} setSelectedDivisionId={s.setSelectedDivisionId}
          participants={s.participants}
          activeParticipantActionId={s.activeParticipantActionId}
          visibility={s.visibility}
          setVisibility={s.setVisibility}
          registrationMode={s.registrationMode}
          setRegistrationMode={s.setRegistrationMode}
          registrationStartDate={s.registrationStartDate} setRegistrationStartDate={s.setRegistrationStartDate}
          registrationEndDate={s.registrationEndDate} setRegistrationEndDate={s.setRegistrationEndDate}
          isSavingConfig={s.isSavingConfig}
          publishFeeAmount={s.publishFeeAmount}
          handlePublish={s.publishFeeAmount > 0 ? s.handlePayPublishFee : s.handlePublish}
          handleOpenLockModal={s.handleOpenLockModal}
          handleSaveRegistrationSettings={s.handleSaveRegistrationSettings}
          handleRegenerateInviteCode={s.handleRegenerateInviteCode}
          handleApproveParticipant={s.handleApproveParticipant}
          handleRejectParticipant={s.handleRejectParticipant}
          handleKickParticipant={s.handleKickParticipant}
          handleSeedMockData={s.handleSeedMockData} handleClearMockData={s.handleClearMockData}
          handleAssignWildcard={s.handleAssignWildcard}
          eloEnabled={s.eloEnabled} setEloEnabled={s.setEloEnabled}
          eloMin={s.eloMin} setEloMin={s.setEloMin}
          eloMax={s.eloMax} setEloMax={s.setEloMax}
          eloMaxCombined={s.eloMaxCombined} setEloMaxCombined={s.setEloMaxCombined}
          eloMaxGap={s.eloMaxGap} setEloMaxGap={s.setEloMaxGap}
          seedingMethod={s.seedingMethod} setSeedingMethod={s.setSeedingMethod}
          isAutoSeeding={s.isAutoSeeding}
          handleAutoSeed={s.handleAutoSeed}
          handleSwapSeeds={s.handleSwapSeeds}
          handleReorderSeeds={s.handleReorderSeeds}
          refetchDivisionData={s.refetchDivisionData}
          onCopyInviteLink={() => { navigator.clipboard.writeText(s.inviteLink); toast.success('Đã sao chép link!'); }} />}

        {s.activeTab === 'bracket' && (
          <div ref={bracketSectionRef}>
            <BracketTab tournament={s.tournament} bracket={s.bracket}
              selectedDivisionId={s.selectedDivisionId} participants={s.participants}
              isGeneratingBracket={s.isGeneratingBracket} handleGenerateBracket={s.handleGenerateBracket}
              handleOpenScheduling={s.handleOpenScheduling} handleOpenRoundModal={s.handleOpenRoundModal}
              isLimitEnabled={s.isLimitEnabled} setIsLimitEnabled={s.setIsLimitEnabled}
              maxParticipants={s.maxParticipants} setMaxParticipants={s.setMaxParticipants}
              matchType={s.matchType} setMatchType={s.setMatchType}
              availableMatchFormatOptions={s.availableMatchFormatOptions}
              selectedCategory={s.selectedCategory}
              sportRuleKind={s.sportRuleKind} setSportRuleKind={s.setSportRuleKind}
              setsToWin={s.setsToWin} setSetsToWin={s.setSetsToWin}
              pointsPerSet={s.pointsPerSet} setPointsPerSet={s.setPointsPerSet}
              winByTwo={s.winByTwo} setWinByTwo={s.setWinByTwo}
              maxDeucePoints={s.maxDeucePoints} setMaxDeucePoints={s.setMaxDeucePoints}
              superTiebreakEnabled={s.superTiebreakEnabled} setSuperTiebreakEnabled={s.setSuperTiebreakEnabled}
              superTiebreakSetIndex={s.superTiebreakSetIndex} setSuperTiebreakSetIndex={s.setSuperTiebreakSetIndex}
              superTiebreakPoints={s.superTiebreakPoints} setSuperTiebreakPoints={s.setSuperTiebreakPoints}
              isSavingConfig={s.isSavingConfig} handleSaveMatchConfig={s.handleSaveMatchConfig}
              tiebreakerMode={s.tiebreakerMode} setTiebreakerMode={s.setTiebreakerMode}
              roundsToPlay={s.roundsToPlay} setRoundsToPlay={s.setRoundsToPlay}
              bracketType={s.bracketTypeState}
              setBracketTypeState={s.setBracketTypeState}
              tournamentFormat={s.bracketType ?? undefined}
              rrWinPoints={s.rrWinPoints} setRrWinPoints={s.setRrWinPoints}
              rrLossPoints={s.rrLossPoints} setRrLossPoints={s.setRrLossPoints}
              rrTiebreakerRule={s.rrTiebreakerRule} setRrTiebreakerRule={s.setRrTiebreakerRule}
              numGroups={s.numGroups} setNumGroups={s.setNumGroups}
              teamsPerGroup={s.teamsPerGroup} setTeamsPerGroup={s.setTeamsPerGroup}
              teamsAdvancing={s.teamsAdvancing} setTeamsAdvancing={s.setTeamsAdvancing}
              divisionRoundConfig={s.divisions.find((division) => division.id === s.selectedDivisionId)?.roundConfig ?? null}
              gskPlayoffType={s.gskPlayoffType} setGskPlayoffType={s.setGskPlayoffType}
              gskSeedingType={s.gskSeedingType} setGskSeedingType={s.setGskSeedingType}
              gskRoundsToPlay={s.gskRoundsToPlay} setGskRoundsToPlay={s.setGskRoundsToPlay}
              handleSaveRoundRobinConfig={s.handleSaveRoundRobinConfig}
              isSavingRoundRobinConfig={s.isSavingRoundRobinConfig}
              handleAdvanceStandings={s.handleAdvanceStandings}
              isAdvancingStandings={s.isAdvancingStandings}
              handleSaveGskConfig={s.handleSaveGskConfig}
              isSavingGskConfig={s.isSavingGskConfig}
              isLiteMode={s.isLiteMode}
              setIsLiteMode={s.setIsLiteMode}
            />
          </div>
        )}

        {s.activeTab === 'finance' && <FinanceTab tournament={s.tournament} participants={s.participants}
          entryFee={s.entryFee} setEntryFee={s.setEntryFee}
          allowEntryFees={s.feesConfig?.allowEntryFees !== false}
          isSavingConfig={s.isSavingConfig} handleSaveFinanceConfig={s.handleSaveFinanceConfig}
          handlePayPlatformFee={s.handlePayPlatformFee} isPayingPlatformFee={s.isPayingPlatformFee}
          handleRequestPayout={s.handleRequestPayout} />}

        {s.activeTab === 'livestream' && <LivestreamTab tournament={s.tournament} bracket={s.bracket} />}

        {s.activeTab === 'permissions' && <PermissionsTab id={id} tournament={s.tournament} />}

        {/* Stage config modal */}
        {s.selectedStage && s.selectedRoundNumber !== null && (
          <Modal open={!!s.selectedStage} onOpenChange={(open) => { if (!open) { s.setSelectedStage(null); s.setSelectedRoundNumber(null); } }}>
            <ModalContent className="bg-white rounded-lg p-6">
              <ModalHeader><ModalTitle className="text-xl font-bold text-slate-900">Cấu hình vòng đấu</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                {s.isLiteMode ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">Chế độ Tự do (Lite) đang bật toàn giải</p>
                      <p className="mt-0.5 text-amber-800">
                        Trọng tài có thể tùy ý cộng/nhập điểm số trực tiếp mà không bị giới hạn bởi luật thi đấu hay cách biệt điểm. Giao diện điều phối được tối giản hoàn toàn.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">{sportPresentation.sportLabel}: {sportPresentation.scoringLabel}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{sportPresentation.roundConfigHint}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Preset nhanh cho vòng đấu</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        {sportPresets.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              s.setStageMaxSets(preset.setsToWin * 2 - 1);
                              s.setStagePointsPerSet(preset.pointsPerSet);
                              s.setStageWinBy2Points(preset.winByTwo);
                              s.setStageMaxDeucePoints(preset.maxPoints);
                              s.setStageSuperTiebreakEnabled(preset.tiebreakPoints !== null);
                              s.setStageSuperTiebreakPoints(preset.tiebreakPoints ?? preset.pointsPerSet);
                            }}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-100"
                          >
                            <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{preset.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500">Địa điểm sân đấu</label>
                    <input
                      type="text"
                      value={s.stageVenueId}
                      onChange={(e) => s.setStageVenueId(e.target.value)}
                      placeholder="Nhập sân thi đấu riêng cho vòng này (để trống sẽ dùng địa điểm giải đấu)..."
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">Giờ mặc định cho vòng này</label>
                    <DateTimePicker value={s.stageScheduledDate} onChange={s.setStageScheduledDate} />
                  </div>

                  {!s.isLiteMode && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500">Số set / game tối đa</label>
                        <select value={s.stageMaxSets} onChange={e => s.setStageMaxSets(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm">
                          <option value={1}>1 set</option><option value={3}>3 set</option><option value={5}>5 set</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">{sportPresentation.setUnitLabel}</label>
                        <input type="number" value={s.stagePointsPerSet} onChange={e => s.setStagePointsPerSet(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={s.stageWinBy2Points} onChange={e => s.setStageWinBy2Points(e.target.checked)} />
                        <label className="text-xs font-bold text-slate-500">{sportPresentation.winByTwoLabel}</label>
                      </div>
                      {s.stageWinBy2Points && (
                        <div>
                          <label className="text-xs font-bold text-slate-500">{sportPresentation.maxScoreLabel}</label>
                          <input type="number" value={s.stageMaxDeucePoints} onChange={e => s.setStageMaxDeucePoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                      )}
                      {supportsTiebreakInput && (
                        <div>
                          <label className="text-xs font-bold text-slate-500">{sportPresentation.tiebreakLabel}</label>
                          <input type="number" value={s.stageSuperTiebreakPoints} onChange={e => s.setStageSuperTiebreakPoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                        </div>
                      )}
                      <div className="col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                        Vòng này sẽ đánh: thắng {Math.ceil(s.stageMaxSets / 2)} {s.sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set'}
                        {' • '}
                        {s.stagePointsPerSet} {s.sportRuleKind === 'TENNIS' ? 'game/set' : 'điểm'}
                        {s.stageWinBy2Points ? ' • hơn 2' : ' • chạm đích là chốt'}
                        {supportsTiebreakInput ? ` • ${sportPresentation.tiebreakLabel.toLowerCase()}: ${s.stageSuperTiebreakPoints}` : ''}
                      </div>
                      {isPickleballSideOut && (
                        <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          Mode side-out: chỉ đội giao bóng mới ghi điểm. Vòng này hiện mới cấu hình score mục tiêu, chưa có state giao bóng live chi tiết.
                        </div>
                      )}
                      <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        Gợi ý nhập điểm: {scoreGuidance.targetSummary} Ví dụ: {scoreGuidance.examples.join(' • ')}.
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500">Ghi chú điều phối vòng này</label>
                    <textarea value={s.stageNotificationNote} onChange={e => s.setStageNotificationNote(e.target.value)} className="min-h-20 w-full border rounded-lg p-2 text-sm" placeholder="Ví dụ: ưu tiên gọi đồng loạt ở sân trung tâm lúc 08:00" />
                  </div>
                </div>
                <Button onClick={s.handleSaveStageDetails} disabled={s.isSavingStage} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
                  {s.isSavingStage ? 'Đang lưu...' : 'Lưu cấu hình'}
                </Button>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Lock modal */}
        {s.isLockModalOpen && (
          <Modal open={s.isLockModalOpen} onOpenChange={(open) => { if (!open) s.setIsLockModalOpen(false); }}>
            <ModalContent className="bg-white rounded-lg p-6">
              <ModalHeader><ModalTitle className="text-xl font-bold text-slate-900">Xác nhận chốt danh sách</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 font-semibold">
                  ⚠️ Sau khi chốt, không thể thêm/sửa người chơi. Hệ thống sẽ tự động sinh sơ đồ thi đấu.
                </div>
                {s.lockSummary && (
                  <div className="space-y-3">
                    <SummarySection title="1. Đăng ký & danh sách">
                      <SummaryRow
                        label="Độ mở tìm thấy"
                        value={s.visibility === 'PRIVATE' ? 'Riêng tư' : 'Công khai (Tìm kiếm được)'}
                      />
                      <SummaryRow
                        label="Chế độ đăng ký"
                        value={
                          s.registrationMode === 'APPROVAL' ? 'Xét duyệt' :
                          s.registrationMode === 'INVITE_ONLY' ? 'Chỉ nhận mã mời' :
                          'Tự do (Vào thẳng danh sách)'
                        }
                      />
                      <SummaryRow
                        label="Hình thức đơn/đôi"
                        value={
                          selectedDivision
                            ? s.getFormatLabel(selectedDivision.matchType, selectedDivision.genderRestriction)
                            : s.matchType.startsWith('SINGLES') ? 'Đơn'
                              : s.matchType.startsWith('MIXED') ? 'Đôi Nam Nữ'
                                : 'Đôi'
                        }
                      />
                      <SummaryRow label="Số đội đăng ký" value={`${s.lockSummary.totalParticipants} đội`} />
                      <SummaryRow label="Số VĐV" value={`${s.lockSummary.totalPlayers} VĐV`} />
                    </SummarySection>

                    <SummarySection title="2. Thể thức sơ đồ">
                      <SummaryRow label="Bảng / Hạng" value={selectedDivision?.name || selectedDivision?.id || '—'} />
                      <SummaryRow
                        label="Loại sơ đồ"
                        value={s.getBracketLabel(selectedDivision?.bracketType ?? s.bracketType)}
                      />
                    </SummarySection>

                    <SummarySection title="3. Cấu hình thể lệ điểm">
                      <SummaryRow
                        label="Môn & thể điểm"
                        value={`${sportPresentation.sportLabel} – ${sportPresentation.scoringLabel}`}
                      />
                      <SummaryRow label="Số set/ván" value={`Thắng ${lockRuleView.setsToWin} (tối đa ${lockRuleView.bestOf})`} />
                      <SummaryRow label={sportPresentation.setUnitLabel} value={`${lockRuleView.pointsPerSet}`} />
                      <SummaryRow
                        label={sportPresentation.winByTwoLabel}
                        value={lockRuleView.winByTwo ? 'Áp dụng' : 'Không áp dụng'}
                      />
                      <SummaryRow label={sportPresentation.maxScoreLabel} value={`${lockRuleView.maxPoints}`} />
                      <SummaryRow label={sportPresentation.tiebreakLabel} value={`${lockRuleView.tiebreakPoints}`} />
                    </SummarySection>

                    <SummarySection title="4. Phí">
                      <SummaryRow
                        label="Lệ phí tham dự"
                        value={
                          (selectedDivision?.entryFee ?? s.entryFee) > 0
                            ? `${(selectedDivision?.entryFee ?? s.entryFee).toLocaleString('vi-VN')}₫`
                            : 'Miễn phí'
                        }
                      />
                      <SummaryRow
                        label="Lệ phí sân/người"
                        value={`${s.lockSummary.platformFeePerPlayer.toLocaleString('vi-VN')}₫/người`}
                      />
                      <SummaryRow label="Quy tắc phí" value={s.lockSummary.platformFeeRuleLabel} />
                      <SummaryRow
                        label="Tổng phí sân"
                        value={`${s.lockSummary.totalPlatformFee.toLocaleString('vi-VN')}₫`}
                      />
                    </SummarySection>
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => s.setIsLockModalOpen(false)}>Hủy</Button>
                  <Button onClick={s.handleConfirmLock} disabled={s.isLocking} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg">
                    {s.isLocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Xác nhận chốt
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Division delete confirm modal */}
        {s.divisionPendingDelete && (
          <Modal open={!!s.divisionPendingDelete} onOpenChange={() => s.setDivisionPendingDelete(null)}>
            <ModalContent className="bg-white rounded-lg p-6">
              <ModalHeader><ModalTitle className="text-lg font-bold">Xóa nội dung này?</ModalTitle></ModalHeader>
              <p className="text-sm text-slate-600 mt-2">Không thể hoàn tác sau khi xóa.</p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => s.setDivisionPendingDelete(null)}>Hủy</Button>
                <Button onClick={s.handleConfirmDeleteDivision} disabled={s.isDeletingDivision} className="bg-rose-600 text-white px-4 py-2 rounded-lg">
                  {s.isDeletingDivision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Xóa
                </Button>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Create Division Modal */}
        {s.isCreateDivisionModalOpen && (
          <Modal open={s.isCreateDivisionModalOpen} onOpenChange={s.setIsCreateDivisionModalOpen}>
            <ModalContent className="bg-white rounded-lg p-6">
            <ModalHeader><ModalTitle className="text-lg font-bold">{s.editingDivision ? 'Chỉnh sửa nội dung thi đấu' : 'Thêm nội dung thi đấu'}</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div><label className="text-xs font-bold text-slate-500">Loại</label>
                  <select value={s.newDivisionMatchType} onChange={e => { const value = e.target.value; const option = s.availableMatchFormatOptions.find((item) => item.value === value); s.setNewDivisionMatchType(value); s.setNewDivisionName(option?.shortLabel ?? ''); }} className="w-full border rounded-lg p-2 text-sm">
                    {s.availableMatchFormatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.shortLabel}
                      </option>
                    ))}
                  </select></div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Tên nội dung riêng</label>
                  <input
                    value={s.newDivisionName}
                    onChange={(e) => s.setNewDivisionName(e.target.value)}
                    placeholder="Ví dụ: Đôi Nam ELO thấp"
                    maxLength={255}
                    className="w-full border rounded-lg p-2 text-sm mt-1"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Để trống sẽ dùng tên mặc định theo loại.</p>
                </div>
                <div><label className="text-xs font-bold text-slate-500">Thể thức</label>
                  <select value={s.newDivisionBracketType} onChange={e => s.setNewDivisionBracketType(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
                    <option value="SINGLE_ELIMINATION">Loại trực tiếp</option>
                    <option value="DOUBLE_ELIMINATION">Nhánh thắng/thua</option>
                    <option value="ROUND_ROBIN">Vòng tròn</option>
                    <option value="GROUP_STAGE_KNOCKOUT">Vòng bảng + Loại trực tiếp</option>
                  </select></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={s.newDivisionLimitEnabled}
                      onChange={(e) => s.setNewDivisionLimitEnabled(e.target.checked)}
                    />
                    Giới hạn số đội đăng ký
                  </label>
                  {s.newDivisionLimitEnabled && (
                    <>
                      <label className="text-xs font-semibold text-slate-600">Số lượng tối đa
                        <input
                          type="number"
                          min={2}
                          max={128}
                          value={s.newDivisionMaxParticipants}
                          onChange={(e) => s.setNewDivisionMaxParticipants(Math.min(128, Math.max(2, Number(e.target.value) || 2)))}
                          className="mt-1 w-full border rounded-lg p-2 text-sm"
                          placeholder="16"
                        />
                      </label>
                      <p className="text-[11px] text-slate-500">Giới hạn áp dụng riêng cho nội dung này, không thay đổi quy mô các nội dung khác.</p>
                    </>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <input type="checkbox" checked={s.newDivisionEloEnabled} onChange={(e) => s.setNewDivisionEloEnabled(e.target.checked)} />
                    Giới hạn ELO riêng cho nội dung này
                  </label>
                  {s.newDivisionEloEnabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-slate-600">ELO tối thiểu
                        <input type="number" min={0} max={3000} value={s.newDivisionMinElo ?? ''} onChange={(e) => s.setNewDivisionMinElo(e.target.value === '' ? null : Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2 text-sm" placeholder="Không giới hạn" />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">ELO tối đa
                        <input type="number" min={0} max={3000} value={s.newDivisionMaxElo ?? ''} onChange={(e) => s.setNewDivisionMaxElo(e.target.value === '' ? null : Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2 text-sm" placeholder="Không giới hạn" />
                      </label>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">Tắt để dùng cấu hình ELO chung của giải.</p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { s.setIsCreateDivisionModalOpen(false); s.resetDivisionEditor(); }}>Hủy</Button>
                  <Button onClick={s.handleCreateDivision} disabled={s.isCreatingDivision} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    {s.isCreatingDivision ? <Loader2 className="w-4 h-4 animate-spin" /> : s.editingDivision ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {s.editingDivision ? 'Lưu thay đổi' : 'Thêm'}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Match Schedule Modal */}
        {s.selectedMatch && (
          <Modal open={!!s.selectedMatch} onOpenChange={() => s.setSelectedMatch(null)}>
            <ModalContent className="bg-white rounded-lg p-6 max-w-lg">
              <ModalHeader><ModalTitle className="text-lg font-bold">Xếp lịch thi đấu</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{sportPresentation.sportLabel}: {s.isLiteMode ? 'Lite theo cấu hình giải' : 'Luật chuẩn theo cấu hình giải'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {s.isCustomMatchConfig
                      ? 'Trận này đang dùng cấu hình riêng đã lưu.'
                      : 'Trận này kế thừa cài đặt điểm của giải; không tự tạo preset khác.'}
                  </p>
                </div>
                <div><label className="text-xs font-bold text-slate-500">Sân</label>
                  <input value={s.matchCourtName} onChange={e => s.setMatchCourtName(e.target.value)} placeholder="Tên sân" className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-bold text-slate-500">Địa chỉ sân</label>
                  <input value={s.matchCourtAddress} onChange={e => s.setMatchCourtAddress(e.target.value)} placeholder="Địa chỉ sân" className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-bold text-slate-500">Giờ thi đấu</label>
                  <DateTimePicker value={s.matchScheduledAt} onChange={s.setMatchScheduledAt} /></div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold text-slate-600">Trọng tài</p>
                  <p className="mt-1 text-xs text-slate-500">Chưa ghi nhận. Khi trọng tài được chấp nhận bấm “Bắt đầu trận” trên Live, hệ thống tự lưu tên người bắt trận.</p>
                </div>
                <div><label className="text-xs font-bold text-slate-500">Camera / Livestream</label>
                  <select value={s.matchCameraId} onChange={e => s.setMatchCameraId(e.target.value)} className="w-full border rounded-lg p-2 text-sm bg-white text-slate-800">
                    <option value="">-- Chưa gán camera --</option>
                    {s.cameras?.map((cam) => (
                      <option key={cam.id} value={cam.id}>📷 {cam.name} ({cam.protocol}) - [{cam.status}]</option>
                    ))}
                  </select></div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <input type="checkbox" checked={s.isCustomMatchConfig} onChange={e => s.setIsCustomMatchConfig(e.target.checked)} />
                  Cấu hình riêng cho trận này
                </label>
                {s.isCustomMatchConfig && (
                  <>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Điều chỉnh luật riêng cho trận này</p>
                      <div className="mt-3 grid gap-3">
                        {sportPresets.map((preset) => (
                          <button
                            key={`match-preset-${preset.id}`}
                            type="button"
                            onClick={() => {
                              s.setMatchSetsToWin(preset.setsToWin);
                              s.setMatchPointsPerSet(preset.pointsPerSet);
                              s.setMatchDeuceEnabled(preset.winByTwo);
                              s.setMatchMaxPoints(preset.maxPoints);
                              s.setMatchSuperTiebreakEnabled(preset.tiebreakPoints !== null);
                              s.setMatchSuperTiebreakPoints(preset.tiebreakPoints ?? preset.pointsPerSet);
                            }}
                            className="rounded-lg border border-blue-200 bg-white px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-100"
                          >
                            <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{preset.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs text-slate-500">Số set / game chạm thắng</label><input type="number" value={s.matchSetsToWin} onChange={e => s.setMatchSetsToWin(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                      <div><label className="text-xs text-slate-500">{sportPresentation.setUnitLabel}</label><input type="number" value={s.matchPointsPerSet} onChange={e => s.setMatchPointsPerSet(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input type="checkbox" checked={s.matchDeuceEnabled} onChange={e => s.setMatchDeuceEnabled(e.target.checked)} />
                        <label className="text-xs font-bold text-slate-500">{sportPresentation.winByTwoLabel}</label>
                      </div>
                      {s.matchDeuceEnabled && <div><label className="text-xs text-slate-500">{sportPresentation.maxScoreLabel}</label><input type="number" value={s.matchMaxPoints} onChange={e => s.setMatchMaxPoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>}
                      {supportsTiebreakInput && <div><label className="text-xs text-slate-500">{sportPresentation.tiebreakLabel}</label><input type="number" value={s.matchSuperTiebreakPoints} onChange={e => s.setMatchSuperTiebreakPoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>}
                      <div className="col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                        Trận này sẽ đánh: thắng {s.matchSetsToWin} {s.sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set'}
                        {' • '}
                        {s.matchPointsPerSet} {s.sportRuleKind === 'TENNIS' ? 'game/set' : 'điểm'}
                        {s.matchDeuceEnabled ? ' • hơn 2' : ' • chạm đích là chốt'}
                        {supportsTiebreakInput ? ` • ${sportPresentation.tiebreakLabel.toLowerCase()}: ${s.matchSuperTiebreakPoints}` : ''}
                      </div>
                      <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        Gợi ý nhập điểm cho trận này: {scoreGuidance.targetSummary} Ví dụ: {scoreGuidance.examples.join(' • ')}.
                      </div>
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => s.setSelectedMatch(null)}>Hủy</Button>
                  <Button onClick={s.handleSaveSchedule} disabled={s.isScheduling} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    {s.isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu'}
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}
      </div>
    </div>
  );
}
