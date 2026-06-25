'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { DateTimePicker } from '@/components/ui/Input';
import { Calendar, AlertTriangle, ExternalLink, Plus, X, Loader2, Trash2, Lock, Trophy, Settings, SlidersHorizontal, DollarSign, FileText, Users } from 'lucide-react';
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
import { OperationsWorkspace } from './components/OperationsWorkspace';
import { useOrganizerOps } from '@/features/organizer/ops/hooks/useOrganizerOps';

export default function TournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const s = useManageState(id);

  const {
    participants: opsParticipants, matches: opsMatches, disputes: opsDisputes,
    referees: opsReferees, activeParticipantActionId, activeMatchActionId,
    canModerateRegistration, activityLog, error: opsError, summary: opsSummary,
    approveParticipant, rejectParticipant, kickParticipant, updateMatchStatus,
    updateMatchSchedule, updateMatchScore, applyMatchOperation, createDispute, resolveDispute,
  } = useOrganizerOps(id, { selectedDivisionId: s.selectedDivisionId, onSelectedDivisionIdChange: s.setSelectedDivisionId });

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

  const TABS = [
    { key: 'basic', label: 'Thông tin', icon: Settings },
    { key: 'schedule', label: 'Lịch & Địa điểm', icon: Calendar },
    { key: 'registration', label: 'Đăng ký', icon: Users },
    { key: 'operations', label: 'Vận hành', icon: SlidersHorizontal },
    { key: 'bracket', label: 'Sơ đồ', icon: Trophy },
    { key: 'finance', label: 'Tài chính', icon: DollarSign },
    { key: 'permissions', label: 'Phân quyền', icon: FileText },
  ] as const;

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
          <Button variant="outline" onClick={() => window.open(`/tournaments/${s.tournament!.id}`, '_blank')} className="border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 font-bold">
            <ExternalLink className="w-4 h-4" /> Xem trang giải
          </Button>
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
              disabled={s.tournament.status === 'REGISTRATION_OPEN' || s.tournament.status === 'REGISTRATION_CLOSED'}
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
        <div className="flex flex-wrap gap-1 mb-6 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => s.setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                s.activeTab === key ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {s.activeTab === 'basic' && <BasicInfoTab id={id} tournament={s.tournament} categories={s.categories}
          basicSubTab={s.basicSubTab} setBasicSubTab={s.setBasicSubTab}
          name={s.name} setName={s.setName} categoryId={s.categoryId} setCategoryId={s.setCategoryId}
          visibility={s.visibility} setVisibility={s.setVisibility} description={s.description} setDescription={s.setDescription}
          logoUrl={s.logoUrl} setLogoUrl={s.setLogoUrl} bannerUrl={s.bannerUrl} setBannerUrl={s.setBannerUrl}
          newGalleryUrl={s.newGalleryUrl} setNewGalleryUrl={s.setNewGalleryUrl}
          isAddingImage={s.isAddingImage} setIsAddingImage={s.setIsAddingImage}
          prizeDescription={s.prizeDescription} setPrizeDescription={s.setPrizeDescription}
          contactInfo={s.contactInfo} setContactInfo={s.setContactInfo}
          isSavingConfig={s.isSavingConfig} isDeleting={s.isDeleting}
          handleDeleteTournament={s.handleDeleteTournament} handleSaveBasicInfo={s.handleSaveBasicInfo}
          handleRegenerateInviteCode={s.handleRegenerateInviteCode} fetchTournamentData={s.fetchTournamentData}
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
          registrationStartDate={s.registrationStartDate} setRegistrationStartDate={s.setRegistrationStartDate}
          registrationEndDate={s.registrationEndDate} setRegistrationEndDate={s.setRegistrationEndDate}
          isSavingConfig={s.isSavingConfig} handleSaveScheduleDetails={s.handleSaveScheduleDetails} />}

        {s.activeTab === 'registration' && <RegistrationTab tournament={s.tournament}
          inviteLink={s.inviteLink} participants={s.participants}
          mockNamesText={s.mockNamesText} setMockNamesText={s.setMockNamesText}
          isSeedingMock={s.isSeedingMock} isClearingMock={s.isClearingMock}
          wildcardEmailOrPhone={s.wildcardEmailOrPhone} setWildcardEmailOrPhone={s.setWildcardEmailOrPhone}
          wildcardTeamName={s.wildcardTeamName} setWildcardTeamName={s.setWildcardTeamName}
          isAssigningWildcard={s.isAssigningWildcard}
          publishFeeAmount={s.publishFeeAmount}
          handlePublish={s.publishFeeAmount > 0 ? s.handlePayPublishFee : s.handlePublish}
          handleOpenLockModal={s.handleOpenLockModal}
          handleUpdateStatus={s.handleUpdateStatus}
          handleSeedMockData={s.handleSeedMockData} handleClearMockData={s.handleClearMockData}
          handleAssignWildcard={s.handleAssignWildcard}
          onCopyInviteLink={() => { navigator.clipboard.writeText(s.inviteLink); toast.success('Đã sao chép link!'); }} />}

        {s.activeTab === 'operations' && <OperationsWorkspace participants={opsParticipants} matches={opsMatches}
          disputes={opsDisputes} referees={opsReferees}
          activeParticipantActionId={activeParticipantActionId} activeMatchActionId={activeMatchActionId}
          canModerateRegistration={canModerateRegistration} activityLog={activityLog}
          error={opsError} summary={opsSummary}
          onApproveParticipant={approveParticipant} onRejectParticipant={rejectParticipant}
          onKickParticipant={kickParticipant} onUpdateMatchStatus={updateMatchStatus}
          onUpdateMatchSchedule={updateMatchSchedule} onUpdateMatchScore={updateMatchScore}
          onApplyMatchOperation={applyMatchOperation} onCreateDispute={createDispute}
          onResolveDispute={resolveDispute} />}

        {s.activeTab === 'bracket' && <BracketTab tournament={s.tournament} bracket={s.bracket}
          selectedDivisionId={s.selectedDivisionId} participants={s.participants}
          isGeneratingBracket={s.isGeneratingBracket} handleGenerateBracket={s.handleGenerateBracket}
          handleOpenScheduling={s.handleOpenScheduling} handleOpenRoundModal={s.handleOpenRoundModal}
          isLimitEnabled={s.isLimitEnabled} setIsLimitEnabled={s.setIsLimitEnabled}
          maxParticipants={s.maxParticipants} setMaxParticipants={s.setMaxParticipants}
          matchType={s.matchType} setMatchType={s.setMatchType}
          setsToWin={s.setsToWin} setSetsToWin={s.setSetsToWin}
          pointsPerSet={s.pointsPerSet} setPointsPerSet={s.setPointsPerSet}
          winByTwo={s.winByTwo} setWinByTwo={s.setWinByTwo}
          maxDeucePoints={s.maxDeucePoints} setMaxDeucePoints={s.setMaxDeucePoints}
          superTiebreakEnabled={s.superTiebreakEnabled} setSuperTiebreakEnabled={s.setSuperTiebreakEnabled}
          superTiebreakSetIndex={s.superTiebreakSetIndex} setSuperTiebreakSetIndex={s.setSuperTiebreakSetIndex}
          superTiebreakPoints={s.superTiebreakPoints} setSuperTiebreakPoints={s.setSuperTiebreakPoints}
          isSavingConfig={s.isSavingConfig} handleSaveMatchConfig={s.handleSaveMatchConfig}
          tiebreakerMode={s.tiebreakerMode} setTiebreakerMode={s.setTiebreakerMode}
          roundsToPlay={s.roundsToPlay} setRoundsToPlay={s.setRoundsToPlay} />}

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
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-500">Số set tối đa</label>
                    <select value={s.stageMaxSets} onChange={e => s.setStageMaxSets(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm">
                      <option value={1}>1 set</option><option value={3}>3 set</option><option value={5}>5 set</option>
                    </select></div>
                  <div><label className="text-xs font-bold text-slate-500">Điểm mỗi set</label>
                    <input type="number" value={s.stagePointsPerSet} onChange={e => s.setStagePointsPerSet(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={s.stageWinBy2Points} onChange={e => s.setStageWinBy2Points(e.target.checked)} />
                    <label className="text-xs font-bold text-slate-500">Deuce (win by 2)</label></div>
                  {s.stageWinBy2Points && <div><label className="text-xs font-bold text-slate-500">Điểm tối đa deuce</label>
                    <input type="number" value={s.stageMaxDeucePoints} onChange={e => s.setStageMaxDeucePoints(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>}
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
                    <option value="MALE_SINGLES">Đơn Nam</option><option value="FEMALE_SINGLES">Đơn Nữ</option>
                    <option value="MALE_DOUBLES">Đôi Nam</option><option value="FEMALE_DOUBLES">Đôi Nữ</option>
                    <option value="MIXED_DOUBLES">Đôi Nam Nữ</option>
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
                <div><label className="text-xs font-bold text-slate-500">Sân</label>
                  <input value={s.matchCourtName} onChange={e => s.setMatchCourtName(e.target.value)} placeholder="Tên sân" className="w-full border rounded-lg p-2 text-sm" /></div>
                <div><label className="text-xs font-bold text-slate-500">Giờ thi đấu</label>
                  <DateTimePicker value={s.matchScheduledAt} onChange={s.setMatchScheduledAt} /></div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <input type="checkbox" checked={s.isCustomMatchConfig} onChange={e => s.setIsCustomMatchConfig(e.target.checked)} />
                  Cấu hình riêng cho trận này
                </label>
                {s.isCustomMatchConfig && <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-slate-500">Số set</label><input type="number" value={s.matchSetsToWin} onChange={e => s.setMatchSetsToWin(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                  <div><label className="text-xs text-slate-500">Điểm/set</label><input type="number" value={s.matchPointsPerSet} onChange={e => s.setMatchPointsPerSet(Number(e.target.value))} className="w-full border rounded-lg p-2 text-sm" /></div>
                </div>}
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
