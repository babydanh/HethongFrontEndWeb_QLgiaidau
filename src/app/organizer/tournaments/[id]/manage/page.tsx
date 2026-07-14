'use client';

import { use, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { DateTimePicker } from '@/components/ui/Input';
import { Calendar, AlertTriangle, ExternalLink, Plus, X, Loader2, Trash2, Lock, Trophy, Settings, DollarSign, FileText, Users } from 'lucide-react';
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
import { getSportRulePresentation } from '@/features/tournaments/sport-rules/presentation';
import { getScoreEntryGuidance, getSportRulePresets } from '@/features/tournaments/sport-rules/ui-guidance';
import { isTournamentRegistrationClosed, isTournamentRegistrationOpen } from '@/utils/tournament-status';

export default function TournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const s = useManageState(id);
  const pendingRefereeCount = s.referees.filter((ref) => ref.status === 'INVITED').length;
  const bracketSectionRef = useRef<HTMLDivElement | null>(null);
  const sportPresentation = getSportRulePresentation(s.sportRuleKind);
  const supportsTiebreakInput = s.sportRuleKind === 'TENNIS' || s.sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const isPickleballSideOut = s.sportRuleKind === 'PICKLEBALL_SIDE_OUT';
  const scoreGuidance = getScoreEntryGuidance(s.sportRuleKind);
  const sportPresets = getSportRulePresets(s.sportRuleKind);

  if (s.isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Đang tải cấu hình quản trị...</p>
      </div>
    </div>
  );

  if (!s.tournament) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
      <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm flex justify-between items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {getSportLogo(s.tournament.category?.name) && <img src={getSportLogo(s.tournament.category?.name)!} alt="" className="w-3 h-3 object-contain" />}
                {s.tournament.category?.name || 'Bộ môn'}
              </span>
              {s.getStatusLabel(s.tournament.status)}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{s.tournament.name}</h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              Khai mạc: {s.tournament.startDate ? formatDate(s.tournament.startDate) : 'Chưa thiết lập'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              onClick={() => { window.location.href = `/organizer/tournaments/${tournament.id}/ops`; }}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-bold"
            >
              Vận hành giải
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenManageBracket}
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1.5 font-bold"
            >
              <Trophy className="w-4 h-4" /> Xem bracket hiện tại
            </Button>
            <Button variant="outline" onClick={() => window.open(buildPublicTournamentUrl(), '_blank')} className="border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 font-bold">
              <ExternalLink className="w-4 h-4" /> Xem trang giải
            </Button>
          </div>
        </div>

        <TournamentStepper tournament={s.tournament} onPublish={s.publishFeeAmount > 0 ? s.handlePayPublishFee : s.handlePublish}
          onNextStep={s.handleTournamentStepTransition} publishFeeAmount={s.publishFeeAmount} isLoading={s.isLoading || s.isPayingPublishFee} />

        {/* Divisions Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Hình thức thi đấu</p>
              <p className="text-xs text-slate-400">Chọn hình thức để xem cấu hình riêng</p>
            </div>
            <Button size="sm" onClick={() => s.setIsCreateDivisionModalOpen(true)}
              disabled={isTournamentRegistrationOpen(s.tournament.status) || isTournamentRegistrationClosed(s.tournament.status)}
              className="font-bold text-xs flex items-center gap-1.5 h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> Thêm hình thức
            </Button>
          </div>
          {s.divisions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {s.divisions.map(div => {
                const isActive = div.id === s.selectedDivisionId;
                return (
                  <div key={div.id} className={`group inline-flex items-center rounded-xl border transition-all ${isActive ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-650 hover:border-blue-300'}`}>
                    <button type="button" onClick={() => { s.setSelectedDivisionId(div.id); s.applyDivisionFormValues(div); }}
                      className="flex items-center gap-2 px-3 py-2 text-left">
                      <span className="min-w-0">
                        <span className="block max-w-[150px] truncate text-xs font-black">{div.name}</span>
                        <span className={`block text-[10px] font-semibold ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{s.getFormatLabel(div.matchType, div.genderRestriction)}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => { s.requestDeleteDivision(div); }}
                      className={`p-2 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-white hover:bg-blue-700' : 'text-slate-400 hover:text-rose-600'}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs nav */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 mb-6 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => s.setActiveTab(key)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full cursor-pointer ${
                s.activeTab === key ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              {key === 'permissions' && pendingRefereeCount > 0 ? (
                <span className={`inline-flex min-w-[18px] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  s.activeTab === key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  {pendingRefereeCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {s.activeTab === 'basic' && <BasicInfoTab id={id} tournament={s.tournament} categories={s.categories}
          basicSubTab={s.basicSubTab} setBasicSubTab={s.setBasicSubTab}
          name={s.name} setName={s.setName} categoryId={s.categoryId} setCategoryId={s.setCategoryId}
          description={s.description} setDescription={s.setDescription}
          logoUrl={s.logoUrl} setLogoUrl={s.setLogoUrl} bannerUrl={s.bannerUrl} setBannerUrl={s.setBannerUrl}
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
          customVenueName={s.customVenueName} setCustomVenueName={s.setCustomVenueName}
          customVenueAddress={s.customVenueAddress} setCustomVenueAddress={s.setCustomVenueAddress}
          provinceCode={s.provinceCode} setProvinceCode={s.setProvinceCode}
          districtCode={s.districtCode} setDistrictCode={s.setDistrictCode}
          wardCode={s.wardCode} setWardCode={s.setWardCode}
          provinces={s.provinces} districts={s.districts} wards={s.wards}
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
          handleSeedMockData={s.handleSeedMockData} handleClearMockData={s.handleClearMockData}
          handleAssignWildcard={s.handleAssignWildcard}
          seedingMethod={s.seedingMethod} setSeedingMethod={s.setSeedingMethod}
          isAutoSeeding={s.isAutoSeeding}
          handleAutoSeed={s.handleAutoSeed}
          handleSwapSeeds={s.handleSwapSeeds}
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
              bracketType={s.bracketType}
              rrWinPoints={s.rrWinPoints} setRrWinPoints={s.setRrWinPoints}
              rrLossPoints={s.rrLossPoints} setRrLossPoints={s.setRrLossPoints}
              rrTiebreakerRule={s.rrTiebreakerRule} setRrTiebreakerRule={s.setRrTiebreakerRule}
              numGroups={s.numGroups} setNumGroups={s.setNumGroups}
              teamsPerGroup={s.teamsPerGroup} setTeamsPerGroup={s.setTeamsPerGroup}
              teamsAdvancing={s.teamsAdvancing} setTeamsAdvancing={s.setTeamsAdvancing}
              allowBestThird={s.allowBestThird} setAllowBestThird={s.setAllowBestThird}
              gskPlayoffType={s.gskPlayoffType} setGskPlayoffType={s.setGskPlayoffType}
              gskSeedingType={s.gskSeedingType} setGskSeedingType={s.setGskSeedingType}
              gskRoundsToPlay={s.gskRoundsToPlay} setGskRoundsToPlay={s.setGskRoundsToPlay}
              handleSaveRoundRobinConfig={s.handleSaveRoundRobinConfig}
              isSavingRoundRobinConfig={s.isSavingRoundRobinConfig}
              handleAdvanceStandings={s.handleAdvanceStandings}
              isAdvancingStandings={s.isAdvancingStandings}
              handleSaveGskConfig={s.handleSaveGskConfig}
              isSavingGskConfig={s.isSavingGskConfig}
            />
          </div>
        )}

        {s.activeTab === 'finance' && <FinanceTab tournament={s.tournament} participants={s.participants}
          entryFee={s.entryFee} setEntryFee={s.setEntryFee}
          isSavingConfig={s.isSavingConfig} handleSaveFinanceConfig={s.handleSaveFinanceConfig}
          handlePayPlatformFee={s.handlePayPlatformFee} isPayingPlatformFee={s.isPayingPlatformFee}
          handleRequestPayout={s.handleRequestPayout} />}

        {s.activeTab === 'permissions' && <PermissionsTab id={id} tournament={s.tournament} />}

        {/* Stage config modal */}
        {s.selectedStage && s.selectedRoundNumber !== null && (
          <Modal open={!!s.selectedStage} onOpenChange={(open) => { if (!open) { s.setSelectedStage(null); s.setSelectedRoundNumber(null); } }}>
            <ModalContent className="bg-white rounded-2xl p-6">
              <ModalHeader><ModalTitle className="text-xl font-bold text-slate-900">Cấu hình vòng đấu</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{sportPresentation.sportLabel}: {sportPresentation.scoringLabel}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{sportPresentation.roundConfigHint}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Preset nhanh cho vòng đấu</p>
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
                        className="rounded-xl border border-blue-200 bg-white px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-100"
                      >
                        <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{preset.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-500">Sân mặc định cho vòng này</label>
                    <select value={s.stageVenueId} onChange={e => s.setStageVenueId(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
                      <option value="">Chưa chọn sân mặc định</option>
                      {s.venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>{venue.name}</option>
                      ))}
                    </select></div>
                  <div><label className="text-xs font-bold text-slate-500">Giờ mặc định cho vòng này</label>
                    <DateTimePicker value={s.stageScheduledDate} onChange={s.setStageScheduledDate} /></div>
                  <div><label className="text-xs font-bold text-slate-500">Số set / game tối đa</label>
                    <select value={s.stageMaxSets} onChange={e => s.setStageMaxSets(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm">
                      <option value={1}>1 set</option><option value={3}>3 set</option><option value={5}>5 set</option>
                    </select></div>
                  <div><label className="text-xs font-bold text-slate-500">{sportPresentation.setUnitLabel}</label>
                    <input type="number" value={s.stagePointsPerSet} onChange={e => s.setStagePointsPerSet(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={s.stageWinBy2Points} onChange={e => s.setStageWinBy2Points(e.target.checked)} />
                    <label className="text-xs font-bold text-slate-500">{sportPresentation.winByTwoLabel}</label></div>
                  {s.stageWinBy2Points && <div><label className="text-xs font-bold text-slate-500">{sportPresentation.maxScoreLabel}</label>
                    <input type="number" value={s.stageMaxDeucePoints} onChange={e => s.setStageMaxDeucePoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>}
                  {supportsTiebreakInput && (
                    <div>
                      <label className="text-xs font-bold text-slate-500">{sportPresentation.tiebreakLabel}</label>
                      <input type="number" value={s.stageSuperTiebreakPoints} onChange={e => s.setStageSuperTiebreakPoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" />
                    </div>
                  )}
                  <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                    Vòng này sẽ đánh: thắng {Math.ceil(s.stageMaxSets / 2)} {s.sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set'}
                    {' • '}
                    {s.stagePointsPerSet} {s.sportRuleKind === 'TENNIS' ? 'game/set' : 'điểm'}
                    {s.stageWinBy2Points ? ' • hơn 2' : ' • chạm đích là chốt'}
                    {supportsTiebreakInput ? ` • ${sportPresentation.tiebreakLabel.toLowerCase()}: ${s.stageSuperTiebreakPoints}` : ''}
                  </div>
                  {isPickleballSideOut && (
                    <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      Mode side-out: chỉ đội giao bóng mới ghi điểm. Vòng này hiện mới cấu hình score mục tiêu, chưa có state giao bóng live chi tiết.
                    </div>
                  )}
                  <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    Gợi ý nhập điểm: {scoreGuidance.targetSummary} Ví dụ: {scoreGuidance.examples.join(' • ')}.
                  </div>
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500">Ghi chú điều phối vòng này</label>
                    <textarea value={s.stageNotificationNote} onChange={e => s.setStageNotificationNote(e.target.value)} className="min-h-20 w-full border rounded-lg p-2 text-sm" placeholder="Ví dụ: ưu tiên gọi đồng loạt ở sân trung tâm lúc 08:00" /></div>
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
            <ModalContent className="bg-white rounded-2xl p-6">
              <ModalHeader><ModalTitle className="text-xl font-bold text-slate-900">Xác nhận chốt danh sách</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 font-semibold">
                  ⚠️ Sau khi chốt, không thể thêm/sửa người chơi. Hệ thống sẽ tự động sinh sơ đồ thi đấu.
                </div>
                {s.lockSummary && (
                  <div className="space-y-2 text-sm">
                    <p>Người chơi: <strong>{s.lockSummary.totalPlayers}</strong></p>
                    <p>Phí sàn: <strong>{s.lockSummary.platformFeePerPlayer.toLocaleString()}₫/người</strong></p>
                    <p>Tổng phí: <strong>{s.lockSummary.totalPlatformFee.toLocaleString()}₫</strong></p>
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
            <ModalContent className="bg-white rounded-2xl p-6">
              <ModalHeader><ModalTitle className="text-lg font-bold">Xóa hình thức này?</ModalTitle></ModalHeader>
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
            <ModalContent className="bg-white rounded-2xl p-6">
              <ModalHeader><ModalTitle className="text-lg font-bold">Thêm hình thức thi đấu</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div><label className="text-xs font-bold text-slate-500">Loại</label>
                  <select value={s.newDivisionMatchType} onChange={e => s.setNewDivisionMatchType(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
                    {s.availableMatchFormatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.shortLabel}
                      </option>
                    ))}
                  </select></div>
                <div><label className="text-xs font-bold text-slate-500">Thể thức</label>
                  <select value={s.newDivisionBracketType} onChange={e => s.setNewDivisionBracketType(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
                    <option value="SINGLE_ELIMINATION">Loại trực tiếp</option><option value="DOUBLE_ELIMINATION">Nhánh thắng/thua</option>
                    <option value="ROUND_ROBIN">Vòng tròn</option>
                  </select></div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => s.setIsCreateDivisionModalOpen(false)}>Hủy</Button>
                  <Button onClick={s.handleCreateDivision} disabled={s.isCreatingDivision} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    {s.isCreatingDivision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Thêm
                  </Button>
                </div>
              </div>
            </ModalContent>
          </Modal>
        )}

        {/* Match Schedule Modal */}
        {s.selectedMatch && (
          <Modal open={!!s.selectedMatch} onOpenChange={() => s.setSelectedMatch(null)}>
            <ModalContent className="bg-white rounded-2xl p-6 max-w-lg">
              <ModalHeader><ModalTitle className="text-lg font-bold">Xếp lịch thi đấu</ModalTitle></ModalHeader>
              <div className="space-y-4 mt-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{sportPresentation.sportLabel}: {sportPresentation.scoringLabel}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{sportPresentation.presetSummary}</p>
                </div>
                <div><label className="text-xs font-bold text-slate-500">Sân</label>
                  <input value={s.matchCourtName} onChange={e => s.setMatchCourtName(e.target.value)} placeholder="Tên sân" className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-bold text-slate-500">Giờ thi đấu</label>
                  <DateTimePicker value={s.matchScheduledAt} onChange={s.setMatchScheduledAt} /></div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <input type="checkbox" checked={s.isCustomMatchConfig} onChange={e => s.setIsCustomMatchConfig(e.target.checked)} />
                  Cấu hình riêng cho trận này
                </label>
                {s.isCustomMatchConfig && (
                  <>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Preset nhanh cho trận này</p>
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
                            className="rounded-xl border border-blue-200 bg-white px-3 py-3 text-left transition-all hover:border-blue-400 hover:bg-blue-100"
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
                      <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
                        Trận này sẽ đánh: thắng {s.matchSetsToWin} {s.sportRuleKind === 'PICKLEBALL_SIDE_OUT' ? 'game' : 'set'}
                        {' • '}
                        {s.matchPointsPerSet} {s.sportRuleKind === 'TENNIS' ? 'game/set' : 'điểm'}
                        {s.matchDeuceEnabled ? ' • hơn 2' : ' • chạm đích là chốt'}
                        {supportsTiebreakInput ? ` • ${sportPresentation.tiebreakLabel.toLowerCase()}: ${s.matchSuperTiebreakPoints}` : ''}
                      </div>
                      <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
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
