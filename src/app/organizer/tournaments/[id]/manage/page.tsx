'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, DateTimePicker } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import {
  tournamentsApi,
  divisionsApi,
  Tournament,
  TournamentFeesConfig,
  TournamentParticipant,
  BracketStage,
  BracketMatch,
  MatchTypeUI,
  MatchTypeDB,
  GenderRestriction,
  Division,
} from '@/features/tournaments/api';
import { venuesApi } from '@/features/venues/api';
import { paymentsApi } from '@/features/payments/api';
import { categoriesApi, Category } from '@/features/categories/api';
import { regionsApi, Region } from '@/features/regions/api';
import { uploadApi } from '@/features/upload/api';
// Removed duplicate BracketTab import
import {
  Settings,
  Calendar,
  Users,
  Trophy,
  MapPin,
  SlidersHorizontal,
  GitBranch,
  DollarSign,
  Info,
  Link as LinkIcon,
  CheckCircle,
  FileText,
  AlertTriangle,
  Lock,
  Plus,
  ExternalLink,
  RefreshCw,
  Gift,
  Image as ImageIcon,
  Trash2,
  UserPlus,
  Loader2,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { TournamentStepper } from './components/TournamentStepper';
import { BasicInfoTab } from './components/BasicInfoTab';
import { ScheduleTab } from './components/ScheduleTab';

import { RegistrationTab } from './components/RegistrationTab';
import { BracketTab } from './components/BracketTab';
import { FinanceTab } from './components/FinanceTab';
import { PermissionsTab, Referee } from './components/PermissionsTab';

interface Venue {
  id: string;
  name: string;
  locationAddress: string;
}

interface Court {
  id: string;
  courtName: string;
}

export default function TournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [bracket, setBracket] = useState<{ stages: BracketStage[] } | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [feesConfig, setFeesConfig] = useState<TournamentFeesConfig | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  
  const getFormatLabel = (matchType: string, genderRestriction?: string | null) => {
    const mt = matchType || '';
    const gr = genderRestriction || '';
    if (mt === 'SINGLES') {
      return gr === 'FEMALE' ? 'Đơn Nữ' : 'Đơn Nam';
    }
    if (mt === 'DOUBLES') {
      return gr === 'FEMALE' ? 'Đôi Nữ' : 'Đôi Nam';
    }
    if (mt === 'MIXED_DOUBLES' || mt === 'MIXED' || gr === 'MIXED') {
      return 'Đôi Nam Nữ';
    }
    return mt;
  };

  const getBracketLabel = (bracketType?: Division['bracketType'] | null) => {
    if (bracketType === 'DOUBLE_ELIMINATION') return 'Loại kép';
    if (bracketType === 'ROUND_ROBIN') return 'Vòng tròn';
    return 'Loại trực tiếp';
  };

  const resolvePublishFeeAmount = useCallback(
    (targetTournament: Tournament | null, targetFees: TournamentFeesConfig | null) => {
      if (!targetTournament || !targetFees) return 0;
      if (targetTournament.tournamentType === 'CLUB') {
        return targetFees.feeClub;
      }
      return targetTournament.isRanked ? targetFees.feePublicRanked : targetFees.feePublicUnranked;
    },
    [],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'registration' | 'bracket' | 'finance' | 'permissions'>('basic');
  const [referees, setReferees] = useState<Referee[]>([]);
  const [refereeEmail, setRefereeEmail] = useState('');
  const [isAddingReferee, setIsAddingReferee] = useState(false);
  const [basicSubTab, setBasicSubTab] = useState<'general' | 'branding' | 'prizes' | 'contact'>('general');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [isCreateDivisionModalOpen, setIsCreateDivisionModalOpen] = useState(false);
  const [newDivisionMatchType, setNewDivisionMatchType] = useState('MALE_DOUBLES');
  const [newDivisionBracketType, setNewDivisionBracketType] = useState('SINGLE_ELIMINATION');
  const [isCreatingDivision, setIsCreatingDivision] = useState(false);
  const [divisionPendingDelete, setDivisionPendingDelete] = useState<Division | null>(null);
  const [isDeletingDivision, setIsDeletingDivision] = useState(false);
  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (
      requestedTab === 'basic' ||
      requestedTab === 'schedule' ||
      requestedTab === 'registration' ||
      requestedTab === 'bracket' ||
      requestedTab === 'finance' ||
      requestedTab === 'permissions'
    ) {
      if (activeTab !== requestedTab) {
        Promise.resolve().then(() => {
          setActiveTab(requestedTab);
        });
      }
    }
  }, [activeTab, searchParams]);

  // Basic info tab form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [contactInfo, setContactInfo] = useState<Record<string, string | undefined>>({});
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [genderRestriction, setGenderRestriction] = useState<'MALE' | 'FEMALE' | 'MIXED' | ''>('');

  // Time & Location Settings
  const [venueId, setVenueId] = useState('');
  const [customVenueName, setCustomVenueName] = useState('');
  const [customVenueAddress, setCustomVenueAddress] = useState('');
  
  // Cascade Regions States
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [registrationEndDate, setRegistrationEndDate] = useState('');
  
  // Pricing & Rules Settings
  const [entryFee, setEntryFee] = useState(0);
  const [platformFeePerPlayer, setPlatformFeePerPlayer] = useState(10000);
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [isLimitEnabled, setIsLimitEnabled] = useState(true);
  const [matchType, setMatchType] = useState('DOUBLES');
  const [setsToWin, setSetsToWin] = useState(2);
  const [pointsPerSet, setPointsPerSet] = useState(21);
  const [winByTwo, setWinByTwo] = useState(true);
  const [maxDeucePoints, setMaxDeucePoints] = useState<number>(30);
  const [superTiebreakEnabled, setSuperTiebreakEnabled] = useState<boolean>(false);
  const [superTiebreakSetIndex, setSuperTiebreakSetIndex] = useState<number>(3);
  const [superTiebreakPoints, setSuperTiebreakPoints] = useState<number>(10);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [selectedStage, setSelectedStage] = useState<BracketStage | null>(null);
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number | null>(null);
  const [stageVenueId, setStageVenueId] = useState('');
  const [stageScheduledDate, setStageScheduledDate] = useState('');
  const [stageNotificationNote, setStageNotificationNote] = useState('');
  const [isSavingStage, setIsSavingStage] = useState(false);

  // Stage-specific match configurations
  const [stageMaxSets, setStageMaxSets] = useState<number>(3);
  const [stagePointsPerSet, setStagePointsPerSet] = useState<number>(21);
  const [stageWinBy2Points, setStageWinBy2Points] = useState<boolean>(true);
  const [stageMaxDeucePoints, setStageMaxDeucePoints] = useState<number>(30);
  const [stageSuperTiebreakEnabled, setStageSuperTiebreakEnabled] = useState<boolean>(false);
  const [stageSuperTiebreakSetIndex, setStageSuperTiebreakSetIndex] = useState<number>(3);
  const [stageSuperTiebreakPoints, setStageSuperTiebreakPoints] = useState<number>(10);

  // Lock List Modal states
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockSummary, setLockSummary] = useState<{
    totalParticipants: number;
    totalPlayers: number;
    platformFeePerPlayer: number;
    totalPlatformFee: number;
  } | null>(null);

  // Scheduling match modal states
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [matchCourtId, setMatchCourtId] = useState('');
  const [matchCourtName, setMatchCourtName] = useState('');
  const [matchCourtAddress, setMatchCourtAddress] = useState('');
  const [matchScheduledAt, setMatchScheduledAt] = useState('');
  const [isCustomMatchConfig, setIsCustomMatchConfig] = useState<boolean>(false);
  const [matchSetsToWin, setMatchSetsToWin] = useState<number>(2);
  const [matchPointsPerSet, setMatchPointsPerSet] = useState<number>(21);
  const [matchDeuceEnabled, setMatchDeuceEnabled] = useState<boolean>(true);
  const [matchMaxPoints, setMatchMaxPoints] = useState<number>(30);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPayingPlatformFee, setIsPayingPlatformFee] = useState(false);
  const [isPayingPublishFee, setIsPayingPublishFee] = useState(false);
  const applyDivisionFormValues = useCallback((selected: Division) => {
    setMatchType(
      selected.genderRestriction === 'FEMALE'
        ? (selected.matchType === 'SINGLES' ? MatchTypeUI.FEMALE_SINGLES : MatchTypeUI.FEMALE_DOUBLES)
        : selected.genderRestriction === 'MIXED'
          ? MatchTypeUI.MIXED_DOUBLES
          : (selected.matchType === 'SINGLES' ? MatchTypeUI.MALE_SINGLES : MatchTypeUI.MALE_DOUBLES)
    );
    setMaxParticipants(selected.maxParticipants || 16);
    setIsLimitEnabled(!!selected.maxParticipants);
    setEntryFee(selected.entryFee || 0);
    const rules = selected.roundConfig || {};
    setSetsToWin(rules.setsToWin || 2);
    setPointsPerSet(rules.pointsPerSet || 21);
    setWinByTwo(rules.winByTwo !== undefined ? rules.winByTwo : true);
    setMaxDeucePoints((rules.maxDeucePoints as number) || 30);
    setSuperTiebreakEnabled(rules.superTiebreakEnabled !== undefined ? (rules.superTiebreakEnabled as boolean) : false);
    setSuperTiebreakSetIndex((rules.superTiebreakSetIndex as number) || 3);
    setSuperTiebreakPoints((rules.superTiebreakPoints as number) || 10);
  }, []);
  const publishFeeAmount = resolvePublishFeeAmount(tournament, feesConfig);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);

  // Mock participant & wildcard states
  const [mockNamesText, setMockNamesText] = useState('');
  const [isSeedingMock, setIsSeedingMock] = useState(false);
  const [isClearingMock, setIsClearingMock] = useState(false);
  const [wildcardEmailOrPhone, setWildcardEmailOrPhone] = useState('');
  const [wildcardTeamName, setWildcardTeamName] = useState('');
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [isAssigningWildcard, setIsAssigningWildcard] = useState(false);

  // Hàm refetch participants + bracket theo division hiện tại
  // Khai báo sớm để dùng trong handleGenerateBracket và các handlers bên dưới
  const fetchReferees = useCallback(async () => {
    try {
      const res = await tournamentsApi.getTournamentReferees(id);
      if (res.data) {
        setReferees(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch referees:', err);
    }
  }, [id]);

  const handleAddReferee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refereeEmail.trim()) return;
    try {
      setIsAddingReferee(true);
      await tournamentsApi.addTournamentReferee(id, refereeEmail.trim());
      toast.success('Thêm trọng tài thành công!');
      setRefereeEmail('');
      await fetchReferees();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAddingReferee(false);
    }
  };

  const handleSaveBasicInfo = async () => {
    try {
      setIsSavingConfig(true);
      const data = {
        name,
        categoryId,
        description,
        bannerUrl: bannerUrl || null,
        logoUrl: logoUrl || null,
        prizeDescription: prizeDescription || null,
        contactInfo,
        visibility,
        genderRestriction: null,
      };
      await tournamentsApi.updateTournament(id, data);

      if (selectedDivisionId) {
        let payloadMatchType: MatchTypeDB = MatchTypeDB.DOUBLES;
        let payloadGenderRestriction: GenderRestriction | null = null;

        if (matchType === 'MALE_SINGLES') {
          payloadMatchType = MatchTypeDB.SINGLES;
          payloadGenderRestriction = GenderRestriction.MALE;
        } else if (matchType === 'FEMALE_SINGLES') {
          payloadMatchType = MatchTypeDB.SINGLES;
          payloadGenderRestriction = GenderRestriction.FEMALE;
        } else if (matchType === 'MALE_DOUBLES') {
          payloadMatchType = MatchTypeDB.DOUBLES;
          payloadGenderRestriction = GenderRestriction.MALE;
        } else if (matchType === 'FEMALE_DOUBLES') {
          payloadMatchType = MatchTypeDB.DOUBLES;
          payloadGenderRestriction = GenderRestriction.FEMALE;
        } else if (matchType === 'MIXED_DOUBLES') {
          payloadMatchType = MatchTypeDB.MIXED_DOUBLES;
          payloadGenderRestriction = GenderRestriction.MIXED;
        }

        const divData = {
          matchType: payloadMatchType,
          genderRestriction: payloadGenderRestriction,
          maxParticipants: isLimitEnabled ? maxParticipants : null,
          isConfigOverride: true,
          roundConfig: {
            setsToWin,
            pointsPerSet,
            winByTwo,
          },
        };
        await divisionsApi.updateDivisionConfig(id, selectedDivisionId, divData);
        await fetchDivisions(id);
      }

      toast.success('Lưu thông tin giải đấu thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const refetchDivisionData = useCallback(async () => {
    if (!selectedDivisionId) return;
    try {
      const [participantsRes, bracketRes] = await Promise.all([
        divisionsApi.getDivisionParticipants(id, selectedDivisionId),
        tournamentsApi.getTournamentBracket(id, selectedDivisionId),
      ]);
      if (participantsRes.data) setParticipants(participantsRes.data);
      if (bracketRes.data) setBracket(bracketRes.data);
      else setBracket(null);
    } catch (err) {
      console.error('Failed to fetch division scoped data:', err);
    }
  }, [id, selectedDivisionId]);

  const handleGenerateBracket = async () => {
    try {
      if (divisions.length > 0 && !selectedDivisionId) {
        toast.error('Vui lòng chọn hình thức trước khi khởi tạo bracket');
        return;
      }
      setIsGeneratingBracket(true);
      toast.loading('Đang khởi tạo sơ đồ thi đấu...', { id: 'gen-bracket' });
      const res = await tournamentsApi.generateBracket(id, selectedDivisionId || undefined);
      if (res.data) {
        toast.success('Khởi tạo sơ đồ thi đấu thành công!', { id: 'gen-bracket' });
        // Dù có hay không có divisionId, refetchDivisionData sẽ fetch đúng bracket
        await refetchDivisionData();
      }
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'gen-bracket' });
    } finally {
      setIsGeneratingBracket(false);
    }
  };

  const fetchTournamentData = async () => {
    try {
      const tRes = await tournamentsApi.getTournamentById(id);
      if (tRes.data) {
        const t = tRes.data;
        setTournament(t);
        setName(t.name);
        setCategoryId(t.categoryId);
        setDescription(t.description || '');
        setBannerUrl(t.bannerUrl || '');
        setLogoUrl(t.logoUrl || '');
        setPrizeDescription(t.prizeDescription || '');
        setContactInfo(t.contactInfo || {});
        setVisibility(t.visibility || 'PUBLIC');
        setGenderRestriction(t.genderRestriction || '');

        setVenueId(t.venueId || '');
        if (t.venue) {
          setCustomVenueName(t.venue.name || '');
          setCustomVenueAddress(t.venue.locationAddress || '');
        }
        setStartDate(t.startDate ? t.startDate.substring(0, 16) : '');
        setEndDate(t.endDate ? t.endDate.substring(0, 16) : '');
        setRegistrationStartDate(t.registrationStartDate ? t.registrationStartDate.substring(0, 16) : '');
        setRegistrationEndDate(t.registrationEndDate ? t.registrationEndDate.substring(0, 16) : '');
        
        setEntryFee(t.entryFee || 0);
        setPlatformFeePerPlayer(t.platformFeePerPlayer || 10000);
        setMaxParticipants(t.maxParticipants || 16);
        setIsLimitEnabled(!!t.maxParticipants);
        // Map backend matchType and genderRestriction to UI match formats
        let uiMatchType = MatchTypeUI.MALE_DOUBLES;
        const mt = t.matchType;
        const gr = t.genderRestriction;
        if (mt === MatchTypeDB.SINGLES) {
          uiMatchType = gr === GenderRestriction.FEMALE ? MatchTypeUI.FEMALE_SINGLES : MatchTypeUI.MALE_SINGLES;
        } else if (mt === MatchTypeDB.DOUBLES) {
          uiMatchType = gr === GenderRestriction.FEMALE ? MatchTypeUI.FEMALE_DOUBLES : MatchTypeUI.MALE_DOUBLES;
        } else if (mt === MatchTypeDB.MIXED_DOUBLES || mt === 'MIXED') {
          uiMatchType = MatchTypeUI.MIXED_DOUBLES;
        }
        setMatchType(uiMatchType);
        
        const rules = t.sportRules || {};
        setSetsToWin(rules.setsToWin || 2);
        setPointsPerSet(rules.pointsPerSet || 21);
        setWinByTwo(rules.winByTwo !== undefined ? rules.winByTwo : true);

        if (t.parentId) {
          fetchDivisions(t.parentId);
        } else {
          // Nếu không có parentId, fetch divisions của tournament này
          fetchDivisions(t.id);
        }
        if (t.venueId) {
          fetchVenueCourts(t.venueId);
        }
      }

      // Participants & bracket are fetched per-division in useEffect([selectedDivisionId])
      // Do NOT fetch all-division data here — it causes stale cross-division data flash
      return tRes.data;
    } catch (err) {
      toast.error('Không thể tải thông tin giải đấu');
    }
  };

  const fetchDivisions = async (tournamentId: string) => {
    try {
      const res = await divisionsApi.getDivisions(tournamentId);
      if (res.data && Array.isArray(res.data)) {
        setDivisions(res.data);
        setSelectedDivisionId((current) => {
          if (res.data.length === 0) return '';
          const requestedDivisionId = searchParams.get('divisionId');
          if (requestedDivisionId && res.data.some((division) => division.id === requestedDivisionId)) {
            const requestedDivision = res.data.find((division) => division.id === requestedDivisionId);
            if (requestedDivision) {
              applyDivisionFormValues(requestedDivision);
            }
            return requestedDivisionId;
          }
          const nextDivisionId = res.data.some((division) => division.id === current) ? current : res.data[0].id;
          const nextDivision = res.data.find((division) => division.id === nextDivisionId);
          if (nextDivision) {
            applyDivisionFormValues(nextDivision);
          }
          return nextDivisionId;
        });
      } else {
        setDivisions([]);
        setSelectedDivisionId('');
      }
    } catch (err) {
      console.error('Failed to fetch divisions:', err);
      setDivisions([]);
      setSelectedDivisionId('');
    }
  };

  const fetchVenueCourts = async (vId: string) => {
    try {
      const vRes = await venuesApi.getVenueById(vId);
      if (vRes.data && vRes.data.courts) {
        setCourts(vRes.data.courts.map(c => ({
          id: c.id,
          courtName: c.name
        })));
      } else {
        setCourts([]);
      }
    } catch (err) {
      console.error('Failed to fetch courts for venue:', err);
    }
  };

  const handleCreateDivision = async () => {
    if (!tournament || !tournament.id) {
      toast.error('Không tìm thấy giải đấu');
      return;
    }

    try {
      setIsCreatingDivision(true);

      let payloadMatchType: MatchTypeDB = MatchTypeDB.DOUBLES;
      let payloadGenderRestriction: GenderRestriction | null = null;

      if (newDivisionMatchType === 'MALE_SINGLES') {
        payloadMatchType = MatchTypeDB.SINGLES;
        payloadGenderRestriction = GenderRestriction.MALE;
      } else if (newDivisionMatchType === 'FEMALE_SINGLES') {
        payloadMatchType = MatchTypeDB.SINGLES;
        payloadGenderRestriction = GenderRestriction.FEMALE;
      } else if (newDivisionMatchType === 'MALE_DOUBLES') {
        payloadMatchType = MatchTypeDB.DOUBLES;
        payloadGenderRestriction = GenderRestriction.MALE;
      } else if (newDivisionMatchType === 'FEMALE_DOUBLES') {
        payloadMatchType = MatchTypeDB.DOUBLES;
        payloadGenderRestriction = GenderRestriction.FEMALE;
      } else if (newDivisionMatchType === 'MIXED_DOUBLES') {
        payloadMatchType = MatchTypeDB.MIXED_DOUBLES;
        payloadGenderRestriction = GenderRestriction.MIXED;
      }

      // Prevent creating duplicate divisions
      const isDuplicate = divisions.some(div => 
        div.matchType === payloadMatchType && 
        div.genderRestriction === payloadGenderRestriction
      );
      if (isDuplicate) {
        toast.error('Hình thức thi đấu này đã tồn tại trong giải đấu. Vui lòng chọn hình thức khác!');
        setIsCreatingDivision(false);
        return;
      }

      // Auto-generate name từ matchType
      const generatedName = getFormatLabel(payloadMatchType, payloadGenderRestriction);

      const divisionPayload = {
        name: generatedName,
        matchType: payloadMatchType,
        genderRestriction: payloadGenderRestriction,
        bracketType: newDivisionBracketType as Division['bracketType'],
        isConfigOverride: true,
      };

      const res = await divisionsApi.createDivision(tournament.id, divisionPayload);
      if (res.data) {
        toast.success(`Đã thêm hình thức "${generatedName}" thành công!`);
        setIsCreateDivisionModalOpen(false);
        setNewDivisionMatchType('MALE_DOUBLES');
        setNewDivisionBracketType('SINGLE_ELIMINATION');
        // Refresh divisions + select new division
        await fetchDivisions(tournament.id);
        setSelectedDivisionId(res.data.id);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsCreatingDivision(false);
    }
  };

  const requestDeleteDivision = (division: Division) => {
    if (divisions.length <= 1) {
      toast.error('Không thể xóa hình thức duy nhất. Giải đấu phải có ít nhất 1 hình thức thi đấu.');
      return;
    }
    setDivisionPendingDelete(division);
  };

  const handleConfirmDeleteDivision = async () => {
    if (!divisionPendingDelete || !tournament?.id) return;

    try {
      setIsDeletingDivision(true);
      toast.loading('Đang xóa hình thức...', { id: 'delete-division' });
      await divisionsApi.deleteDivision(divisionPendingDelete.id);
      toast.success('Đã xóa hình thức thành công!', { id: 'delete-division' });
      
      // Refresh divisions + clear selection nếu xoá division đang chọn
      if (selectedDivisionId === divisionPendingDelete.id) {
        setSelectedDivisionId('');
      }
      setDivisionPendingDelete(null);
      await fetchDivisions(tournament.id);
    } catch (err) {
      toast.error(getErrorMessage(err), { id: 'delete-division' });
    } finally {
      setIsDeletingDivision(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const t = await fetchTournamentData();
      if (t?.id) await fetchDivisions(t.id);
      try {
        const vRes = await venuesApi.getVenues();
        if (vRes.data) setVenues(vRes.data);
        
        const cRes = await categoriesApi.getCategories();
        if (cRes.data) setCategories(cRes.data);

        const feesRes = await tournamentsApi.getFeesConfig();
        if (feesRes.data) {
          setFeesConfig(feesRes.data);
        }

        const pList = await regionsApi.getProvinces();
        setProvinces(pList);

        if (t && t.city) {
          const matchedProvince = pList.find(p => p.name === t.city || p.fullName === t.city);
          if (matchedProvince) {
            setProvinceCode(matchedProvince.code);
            const dList = await regionsApi.getDistricts(matchedProvince.code);
            setDistricts(dList);

            if (t.venue && t.venue.locationAddress) {
              const addr = t.venue.locationAddress;
              const matchedDistrict = dList.find(d => addr.includes(d.name) || addr.includes(d.fullName));
              if (matchedDistrict) {
                setDistrictCode(matchedDistrict.code);
                const wList = await regionsApi.getWards(matchedDistrict.code);
                setWards(wList);

                const matchedWard = wList.find(w => addr.includes(w.name) || addr.includes(w.fullName));
                if (matchedWard) {
                  setWardCode(matchedWard.code);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [id, resolvePublishFeeAmount]);

  // refetchDivisionData đã được khai báo ở trên (trước handleGenerateBracket)
  // useEffect dùng lại cùng tham chiếu
  useEffect(() => {
    Promise.resolve().then(() => {
      refetchDivisionData();
    });
  }, [refetchDivisionData]);

  // Fetch divisions khi page load
  useEffect(() => {
    fetchDivisions(id);
  }, [id]);

  // Fetch districts when provinceCode changes
  useEffect(() => {
    if (provinceCode) {
      regionsApi.getDistricts(provinceCode)
        .then(setDistricts)
        .catch(err => console.error('Failed to load districts', err));
    } else {
      if (districts.length > 0) {
        Promise.resolve().then(() => {
          setDistricts([]);
        });
      }
      if (wards.length > 0) {
        Promise.resolve().then(() => {
          setWards([]);
        });
      }
    }
  }, [provinceCode]);

  // Fetch wards when districtCode changes
  useEffect(() => {
    if (districtCode) {
      regionsApi.getWards(districtCode)
        .then(setWards)
        .catch(err => console.error('Failed to load wards', err));
    } else {
      if (wards.length > 0) {
        Promise.resolve().then(() => {
          setWards([]);
        });
      }
    }
  }, [districtCode]);



  const handleSaveScheduleDetails = async () => {
    try {
      setIsSavingConfig(true);
      
      const provinceName = provinces.find(p => p.code === provinceCode)?.name || '';
      const districtName = districts.find(d => d.code === districtCode)?.name || '';
      const wardName = wards.find(w => w.code === wardCode)?.name || '';

      const fullAddress = [
        customVenueAddress.trim(),
        wardName,
        districtName,
        provinceName
      ].filter(Boolean).join(', ');
      if (!customVenueName.trim() || !fullAddress) {
        toast.error('Vui lòng điền tên sân và các trường địa chỉ');
        setIsSavingConfig(false);
        return;
      }
      
      // Date Constraints Validation
      if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        toast.error('Ngày kết thúc giải phải sau ngày khai mạc');
        setIsSavingConfig(false);
        return;
      }
      if (registrationStartDate && registrationEndDate && new Date(registrationEndDate) <= new Date(registrationStartDate)) {
        toast.error('Hạn chót đăng ký phải sau ngày mở đăng ký');
        setIsSavingConfig(false);
        return;
      }
      if (startDate && registrationEndDate && new Date(startDate) < new Date(registrationEndDate)) {
        toast.error('Ngày khai mạc giải phải sau hoặc bằng hạn chốt đăng ký');
        setIsSavingConfig(false);
        return;
      }
      
      let finalVenueId = venueId === '' ? null : venueId;
      toast.loading('Đang cập nhật thông tin địa điểm...', { id: 'create-venue' });
      
      const res = await venuesApi.createVenue({
        name: customVenueName.trim(),
        locationAddress: fullAddress
      });
      
      if (res && res.data && res.data.id) {
        finalVenueId = res.data.id;
        toast.success('Đã cập nhật thông tin địa điểm!', { id: 'create-venue' });
      } else {
        toast.error('Lỗi cập nhật địa điểm', { id: 'create-venue' });
        setIsSavingConfig(false);
        return;
      }

      const data = {
        venueId: finalVenueId,
        city: provinceName || null,
        startDate: startDate === '' ? null : new Date(startDate).toISOString(),
        endDate: endDate === '' ? null : new Date(endDate).toISOString(),
        registrationStartDate: registrationStartDate === '' ? null : new Date(registrationStartDate).toISOString(),
        registrationEndDate: registrationEndDate === '' ? null : new Date(registrationEndDate).toISOString(),
      };
      await tournamentsApi.updateTournament(id, data);
      toast.success('Lưu thông tin lịch và địa điểm thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveMatchConfig = async () => {
    try {
      if (!tournament || !selectedDivisionId) {
        toast.error('Vui lòng chọn hình thức trước khi lưu');
        return;
      }
      setIsSavingConfig(true);

      let payloadMatchType: MatchTypeDB = MatchTypeDB.DOUBLES;
      let payloadGenderRestriction: GenderRestriction | null = null;

      if (matchType === 'MALE_SINGLES') {
        payloadMatchType = MatchTypeDB.SINGLES;
        payloadGenderRestriction = GenderRestriction.MALE;
      } else if (matchType === 'FEMALE_SINGLES') {
        payloadMatchType = MatchTypeDB.SINGLES;
        payloadGenderRestriction = GenderRestriction.FEMALE;
      } else if (matchType === 'MALE_DOUBLES') {
        payloadMatchType = MatchTypeDB.DOUBLES;
        payloadGenderRestriction = GenderRestriction.MALE;
      } else if (matchType === 'FEMALE_DOUBLES') {
        payloadMatchType = MatchTypeDB.DOUBLES;
        payloadGenderRestriction = GenderRestriction.FEMALE;
      } else if (matchType === 'MIXED_DOUBLES') {
        payloadMatchType = MatchTypeDB.MIXED_DOUBLES;
        payloadGenderRestriction = GenderRestriction.MIXED;
      }

      const selected = divisions.find(d => d.id === selectedDivisionId);
      const currentRounds = selected?.roundConfig?.rounds || {};

      const data = {
        matchType: payloadMatchType,
        genderRestriction: payloadGenderRestriction,
        maxParticipants: isLimitEnabled ? maxParticipants : null,
        isConfigOverride: true,
        roundConfig: {
          setsToWin,
          pointsPerSet,
          winByTwo,
          maxDeucePoints: winByTwo ? maxDeucePoints : null,
          superTiebreakEnabled,
          superTiebreakSetIndex: superTiebreakEnabled ? superTiebreakSetIndex : null,
          superTiebreakPoints: superTiebreakEnabled ? superTiebreakPoints : null,
          rounds: currentRounds,
        },
      };
      await divisionsApi.updateDivisionConfig(tournament.id, selectedDivisionId, data);
      toast.success('Lưu cấu hình thi đấu thành công!');
      await fetchDivisions(tournament.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveFinanceConfig = async () => {
    try {
      if (!tournament || !selectedDivisionId) {
        toast.error('Vui lòng chọn hình thức trước khi lưu');
        return;
      }
      setIsSavingConfig(true);
      const data = {
        entryFee,
      };
      await divisionsApi.updateDivision(selectedDivisionId, data);
      toast.success('Lưu cài đặt tài chính thành công!');
      await fetchDivisions(tournament.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRegenerateInviteCode = async () => {
    try {
      setIsLoading(true);
      await tournamentsApi.regenerateInviteCode(id);
      toast.success('Đã tạo lại mã mời mới!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsLoading(true);
      await tournamentsApi.publishTournament(id);
      toast.success('Giải đấu đã chính thức được công bố!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPublishFee = async () => {
    try {
      if (!tournament) {
        toast.error('Không tìm thấy thông tin giải đấu.');
        return;
      }
      if (publishFeeAmount <= 0) {
        await handlePublish();
        return;
      }

      setIsPayingPublishFee(true);
      const res = await paymentsApi.createPaymentLink({
        tournamentId: id,
        amount: publishFeeAmount,
      });

      if (res.data?.paymentUrl) {
        toast.success('Đang chuyển đến bước thanh toán phí công bố giải đấu.');
        router.push(res.data.paymentUrl);
      } else {
        toast.error('Không tìm thấy liên kết thanh toán phí công bố.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsPayingPublishFee(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản nháp giải đấu này? Thao tác này không thể hoàn tác.')) {
      return;
    }
    try {
      setIsDeleting(true);
      const res = await tournamentsApi.deleteTournament(id);
      const resData = res?.data as unknown as { pendingDelete?: boolean; message?: string } | undefined;

      if (resData?.pendingDelete) {
        toast.success(resData.message || 'Yêu cầu xóa giải đấu đã được gửi tới Quản trị viên để xét duyệt.');
      } else {
        toast.success('Đã xóa giải đấu thành công!');
      }

      router.push('/organizer/tournaments');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePayPlatformFee = async () => {
    try {
      setIsPayingPlatformFee(true);
      const totalPlayers = participants.reduce((sum, p) => sum + (p.members?.length || 0), 0);
      const amount = totalPlayers * platformFeePerPlayer;
      const res = await paymentsApi.createPaymentLink({
        tournamentId: id,
        amount,
      });
      if (res.data?.paymentUrl) {
        window.open(res.data.paymentUrl, '_blank');
        toast.success('Đã mở liên kết thanh toán. Vui lòng thanh toán phí sàn để tiếp tục.');
      } else {
        toast.error('Không tìm thấy liên kết thanh toán.');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsPayingPlatformFee(false);
    }
  };

  const handleTournamentStepTransition = async (nextStatus: Tournament['status']) => {
    try {
      if (nextStatus === 'UPCOMING') {
        handleOpenLockModal();
        return;
      }

      setIsLoading(true);
      await tournamentsApi.updateTournament(id, { status: nextStatus });
      toast.success(
        nextStatus === 'IN_PROGRESS'
          ? 'Giải đấu đã chuyển sang trạng thái đang thi đấu.'
          : 'Giải đấu đã được đánh dấu hoàn thành.',
      );
      await fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGalleryImage = async () => {
    if (!newGalleryUrl.trim()) return;
    try {
      setIsAddingImage(true);
      await tournamentsApi.addTournamentGalleryImage(id, newGalleryUrl.trim());
      toast.success('Đã thêm ảnh vào bộ sưu tập!');
      setNewGalleryUrl('');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleRemoveGalleryImage = async (index: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi bộ sưu tập?')) return;
    try {
      await tournamentsApi.removeTournamentGalleryImage(id, index);
      toast.success('Đã xóa ảnh thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleOpenLockModal = () => {
    if (participants.length < 2) {
      toast.error('Cần ít nhất 2 đội/VĐV đã đăng ký để chốt danh sách');
      return;
    }
    const totalPlayers = participants.reduce((sum, p) => sum + (p.members?.length || 0), 0);
    const totalPlatformFee = totalPlayers * platformFeePerPlayer;
    setLockSummary({
      totalParticipants: participants.length,
      totalPlayers,
      platformFeePerPlayer,
      totalPlatformFee,
    });
    setIsLockModalOpen(true);
  };

  const handleConfirmLock = async () => {
    try {
      setIsLocking(true);
      await tournamentsApi.lockTournament(id);
      toast.success('Chốt danh sách và tạo sơ đồ thi đấu thành công!');
      setIsLockModalOpen(false);
      // fetchTournamentData vì lock có thể thay đổi tournament status
      fetchTournamentData();
      await refetchDivisionData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLocking(false);
    }
  };

  const handleSeedMockData = async () => {
    if (!mockNamesText.trim()) {
      toast.error('Vui lòng nhập danh sách người chơi/đội ảo');
      return;
    }
    const names = mockNamesText.split('\n').map(n => n.trim()).filter(Boolean);
    if (names.length === 0) {
      toast.error('Vui lòng nhập ít nhất một tên hợp lệ');
      return;
    }
    try {
      setIsSeedingMock(true);
      await tournamentsApi.seedMockParticipants(id, names, selectedDivisionId || undefined);
      toast.success(`Đã sinh ${names.length} người chơi/đội ảo thành công!`);
      setMockNamesText('');
      await refetchDivisionData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSeedingMock(false);
    }
  };

  const handleClearMockData = async () => {
    if (!confirm('Bạn có chắc chắn muốn dọn dẹp toàn bộ dữ liệu người chơi thử nghiệm? Hành động này sẽ xóa tất cả người chơi mock và các đội liên quan.')) {
      return;
    }
    try {
      setIsClearingMock(true);
      await tournamentsApi.clearMockParticipants(id, selectedDivisionId || undefined);
      toast.success('Đã dọn dẹp dữ liệu người chơi ảo thành công!');
      await refetchDivisionData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsClearingMock(false);
    }
  };

  const handleAssignWildcard = async () => {
    if (!wildcardEmailOrPhone.trim()) {
      toast.error('Vui lòng nhập Email hoặc Số điện thoại tài khoản Baseline');
      return;
    }
    if (!wildcardTeamName.trim()) {
      toast.error('Vui lòng nhập Tên đội thi đấu');
      return;
    }
    if (divisions.length > 0 && !selectedDivisionId) {
      toast.error('Vui lòng chọn hình thức thi đấu trước khi gán suất đặc cách');
      return;
    }
    try {
      setIsAssigningWildcard(true);
      await tournamentsApi.assignReservedSlot(
        id,
        wildcardEmailOrPhone.trim(),
        wildcardTeamName.trim(),
        undefined,
        selectedDivisionId || undefined,
      );
      toast.success('Đã gán suất đặc cách thành công!');
      setWildcardEmailOrPhone('');
      setWildcardTeamName('');
      await refetchDivisionData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAssigningWildcard(false);
    }
  };

  const handleUpdateStatus = async (participantId: string, status: 'COMPLETE' | 'PENDING' | 'WITHDRAWN') => {
    try {
      await tournamentsApi.updateParticipantStatus(id, participantId, status);
      toast.success(`Đã cập nhật trạng thái đăng ký thành công!`);
      await refetchDivisionData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleOpenRoundModal = (stage: BracketStage, roundNumber: number) => {
    setSelectedStage(stage);
    setSelectedRoundNumber(roundNumber);
    
    // Load config for this specific round number
    const roundConfig = stage.roundConfig?.rounds?.[roundNumber.toString()];
    
    if (roundConfig) {
      setStageMaxSets(roundConfig.sets_to_win === 1 ? 1 : roundConfig.sets_to_win === 2 ? 3 : 5);
      setStagePointsPerSet(roundConfig.points_per_set || 21);
      setStageWinBy2Points(roundConfig.deuce_enabled !== undefined ? roundConfig.deuce_enabled : true);
      setStageMaxDeucePoints(roundConfig.max_points || 30);
      setStageSuperTiebreakEnabled(roundConfig.tiebreak_at !== undefined);
      setStageSuperTiebreakSetIndex(3);
      setStageSuperTiebreakPoints(roundConfig.tiebreak_at || 10);
    } else {
      // Fallback to division defaults
      setStageMaxSets(setsToWin === 1 ? 1 : setsToWin === 2 ? 3 : 5);
      setStagePointsPerSet(pointsPerSet);
      setStageWinBy2Points(winByTwo);
      setStageMaxDeucePoints(30);
      setStageSuperTiebreakEnabled(false);
      setStageSuperTiebreakSetIndex(3);
      setStageSuperTiebreakPoints(10);
    }
  };

  const handleSaveStageDetails = async () => {
    if (!selectedStage || selectedRoundNumber === null) return;
    try {
      setIsSavingStage(true);
      
      const currentRounds = selectedStage.roundConfig?.rounds || {};
      const updatedRoundConfig = {
        ...selectedStage.roundConfig,
        rounds: {
          ...currentRounds,
          [selectedRoundNumber.toString()]: {
            sets_to_win: stageMaxSets === 1 ? 1 : stageMaxSets === 3 ? 2 : 3,
            points_per_set: stagePointsPerSet,
            deuce_enabled: stageWinBy2Points,
            max_points: stageWinBy2Points ? stageMaxDeucePoints : null,
            tiebreak_at: stageSuperTiebreakEnabled ? stageSuperTiebreakPoints : undefined,
          }
        }
      };

      await tournamentsApi.updateStage(selectedStage.id, {
        roundConfig: updatedRoundConfig
      });
      
      toast.success('Cập nhật cấu hình vòng đấu thành công!');
      setSelectedStage(null);
      setSelectedRoundNumber(null);
      await refetchDivisionData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleUpdateStageRoundConfig = async (
    stageId: string,
    configData: Partial<NonNullable<BracketStage['roundConfig']>>
  ) => {
    const stage = bracket?.stages.find(s => s.id === stageId);
    if (!stage) return;
    const currentConfig = stage.roundConfig || {};
    const updatedConfig = { ...currentConfig, ...configData };
    try {
      await tournamentsApi.updateStage(stageId, { roundConfig: updatedConfig });
      toast.success('Đã cập nhật quy tắc thi đấu cho vòng này');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleOpenScheduling = (match: BracketMatch) => {
    setSelectedMatch(match);
    setMatchCourtName(match.courtName || '');
    setMatchCourtAddress(match.courtAddress || '');
    setMatchScheduledAt(match.scheduledAt ? match.scheduledAt.substring(0, 16) : '');
    
    if (match.matchConfig && Object.keys(match.matchConfig).length > 0) {
      setIsCustomMatchConfig(true);
      setMatchSetsToWin(match.matchConfig.setsToWin || 2);
      setMatchPointsPerSet(match.matchConfig.pointsPerSet || 21);
      setMatchDeuceEnabled(match.matchConfig.deuceEnabled !== false);
      setMatchMaxPoints(match.matchConfig.maxPoints || 30);
    } else {
      setIsCustomMatchConfig(false);
      
      // Load current round settings or default settings as the starting custom values
      const stage = bracket?.stages.find(s => s.groups.some(g => g.id === match.groupId));
      const roundConfig = stage?.roundConfig?.rounds?.[match.roundNumber?.toString()];
      
      if (roundConfig) {
        setMatchSetsToWin(roundConfig.sets_to_win === 1 ? 1 : roundConfig.sets_to_win === 2 ? 2 : 3);
        setMatchPointsPerSet(roundConfig.points_per_set || 21);
        setMatchDeuceEnabled(roundConfig.deuce_enabled !== false);
        setMatchMaxPoints(roundConfig.max_points || 30);
      } else {
        setMatchSetsToWin(setsToWin);
        setMatchPointsPerSet(pointsPerSet);
        setMatchDeuceEnabled(winByTwo);
        setMatchMaxPoints(30);
      }
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedMatch) return;
    try {
      setIsScheduling(true);
      
      const finalMatchConfig = isCustomMatchConfig ? {
        setsToWin: matchSetsToWin,
        pointsPerSet: matchPointsPerSet,
        deuceEnabled: matchDeuceEnabled,
        tiebreakAt: matchPointsPerSet - 1,
        maxPoints: matchDeuceEnabled ? matchMaxPoints : null,
      } : null;

      await tournamentsApi.updateMatchSchedule(selectedMatch.id, {
        courtName: matchCourtName === '' ? null : matchCourtName,
        courtAddress: matchCourtAddress === '' ? null : matchCourtAddress,
        scheduledAt: matchScheduledAt === '' ? null : new Date(matchScheduledAt).toISOString(),
        matchConfig: finalMatchConfig,
      });
      toast.success('Cập nhật lịch thi đấu thành công!');
      setSelectedMatch(null);
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsScheduling(false);
    }
  };

  const getStatusLabel = (status: Tournament['status']) => {
    switch (status) {
      case 'DRAFT':
        return <Badge className="bg-slate-100 text-slate-700">Nháp (Ẩn)</Badge>;
      case 'REGISTRATION_OPEN':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Mở Đăng Ký</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200">Chờ duyệt công bố</Badge>;
      case 'REGISTRATION_CLOSED':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Đóng Đăng Ký</Badge>;
      case 'UPCOMING':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Sắp Khởi Tranh</Badge>;
      case 'IN_PROGRESS':
      case 'ONGOING':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 animate-pulse">Đang Thi Đấu</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Đã Kết Thúc</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Đã Hủy</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Đang tải cấu hình quản trị...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy giải đấu</h2>
          <p className="text-slate-500 mt-2">Giải đấu không tồn tại hoặc bạn không có quyền truy cập quản trị.</p>
        </div>
      </div>
    );
  }

  const inviteLink = tournament.visibility === 'PRIVATE'
    ? `${window.location.origin}/tournaments/${tournament.id}/register?invite=${tournament.inviteCode}`
    : `${window.location.origin}/tournaments/join/${tournament.inviteCode}`;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Tournament Info Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {tournament.category?.name || 'Bộ môn'}
              </span>
              {getStatusLabel(tournament.status)}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{tournament.name}</h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              Khai mạc: {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('vi-VN') : 'Chưa thiết lập'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(`/tournaments/${tournament.id}`, '_blank')}
              className="border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 font-bold"
            >
              <ExternalLink className="w-4 h-4" /> Xem trang giải
            </Button>
          </div>
        </div>

        <TournamentStepper
          tournament={tournament}
          onPublish={publishFeeAmount > 0 ? handlePayPublishFee : handlePublish}
          onNextStep={handleTournamentStepTransition}
          publishFeeAmount={publishFeeAmount}
          isLoading={isLoading || isPayingPublishFee}
        />

        {/* Divisions Selector & Quick Switch */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Hình thức thi đấu</p>
              <p className="text-xs text-slate-400">Chọn hình thức để xem danh sách, bracket và cấu hình riêng</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateDivisionModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 h-9 px-3 rounded-lg whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm hình thức
            </Button>
          </div>

          {divisions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {divisions.map((div) => {
                const isActive = div.id === selectedDivisionId;
                return (
                  <div
                    key={div.id}
                    className={`group inline-flex items-center rounded-xl border transition-all ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-650 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDivisionId(div.id);
                        applyDivisionFormValues(div);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-left"
                      title={`${div.name} • ${getFormatLabel(div.matchType, div.genderRestriction)}`}
                    >
                      <span className="min-w-0">
                        <span className="block max-w-[150px] truncate text-xs font-black">{div.name}</span>
                        <span className={`block text-[10px] font-semibold ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                          {getFormatLabel(div.matchType, div.genderRestriction)}
                        </span>
                        <span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-black ${isActive ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                          {getBracketLabel(div.bracketType)}
                        </span>
                      </span>
                      {div._count?.participants !== undefined && (
                        <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {div._count.participants}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteDivision(div)}
                      className={`mr-1 rounded-lg p-1.5 transition-colors ${
                        isActive ? 'text-white/70 hover:bg-white/15 hover:text-white' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                      }`}
                      title={`Xóa ${div.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
              <p className="text-base font-black text-slate-900">Chưa có hình thức thi đấu</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Hãy thêm ít nhất 1 hình thức để quản lý người chơi, cấu hình luật và tạo bracket.
              </p>
              <Button
                size="sm"
                onClick={() => setIsCreateDivisionModalOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Thêm hình thức thi đấu
              </Button>
            </div>
          )}
        </div>

        {selectedDivisionId && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <span className="font-semibold">Đang quản lý:</span>
            <span className="font-black text-slate-900">
              {divisions.find((division) => division.id === selectedDivisionId)?.name}
            </span>
            <span className="text-slate-300">•</span>
            <span>{getFormatLabel(
              divisions.find((division) => division.id === selectedDivisionId)?.matchType || '',
              divisions.find((division) => division.id === selectedDivisionId)?.genderRestriction,
            )}</span>
          </div>
        )}

        {/* Tab Headers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'basic' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Thông Tin Cơ Bản
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'schedule' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Lịch & Địa Điểm
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'registration' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Đăng Ký & Chốt DS
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'bracket' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" /> Sơ đồ thi đấu
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'finance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Tài chính & rút tiền
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'permissions' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Phân Quyền
          </button>
        </div>

        {/* TAB 1: BASIC INFO */}
        {activeTab === 'basic' && tournament && (
          <BasicInfoTab
            id={id}
            tournament={tournament}
            categories={categories}
            basicSubTab={basicSubTab}
            setBasicSubTab={setBasicSubTab}
            name={name}
            setName={setName}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            visibility={visibility}
            setVisibility={setVisibility}
            description={description}
            setDescription={setDescription}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            bannerUrl={bannerUrl}
            setBannerUrl={setBannerUrl}
            newGalleryUrl={newGalleryUrl}
            setNewGalleryUrl={setNewGalleryUrl}
            isAddingImage={isAddingImage}
            setIsAddingImage={setIsAddingImage}
            prizeDescription={prizeDescription}
            setPrizeDescription={setPrizeDescription}
            contactInfo={contactInfo}
            setContactInfo={setContactInfo}
            isSavingConfig={isSavingConfig}
            isDeleting={isDeleting}
            handleDeleteTournament={handleDeleteTournament}
            handleSaveBasicInfo={handleSaveBasicInfo}
            handleRegenerateInviteCode={handleRegenerateInviteCode}
            fetchTournamentData={fetchTournamentData}
            divisions={divisions}
            selectedDivisionId={selectedDivisionId}
            isLimitEnabled={isLimitEnabled}
            setIsLimitEnabled={setIsLimitEnabled}
            maxParticipants={maxParticipants}
            setMaxParticipants={setMaxParticipants}
            matchType={matchType}
            setMatchType={setMatchType}
            setsToWin={setsToWin}
            setSetsToWin={setSetsToWin}
            pointsPerSet={pointsPerSet}
            setPointsPerSet={setPointsPerSet}
            winByTwo={winByTwo}
            setWinByTwo={setWinByTwo}
          />
        )}

        {/* TAB 2: SCHEDULE & LOCATIONS */}
        {activeTab === 'schedule' && tournament && (
          <ScheduleTab
            tournament={tournament}
            bracket={bracket}
            venues={venues}
            customVenueName={customVenueName}
            setCustomVenueName={setCustomVenueName}
            customVenueAddress={customVenueAddress}
            setCustomVenueAddress={setCustomVenueAddress}
            provinceCode={provinceCode}
            setProvinceCode={setProvinceCode}
            districtCode={districtCode}
            setDistrictCode={setDistrictCode}
            wardCode={wardCode}
            setWardCode={setWardCode}
            provinces={provinces}
            districts={districts}
            wards={wards}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            registrationStartDate={registrationStartDate}
            setRegistrationStartDate={setRegistrationStartDate}
            registrationEndDate={registrationEndDate}
            setRegistrationEndDate={setRegistrationEndDate}
            isSavingConfig={isSavingConfig}
            handleSaveScheduleDetails={handleSaveScheduleDetails}
          />
        )}


        {/* TAB 4: REGISTRATION & LOCK LIST */}
        {activeTab === 'registration' && tournament && (
          <RegistrationTab
            tournament={tournament}
            inviteLink={inviteLink}
            participants={participants}
            mockNamesText={mockNamesText}
            setMockNamesText={setMockNamesText}
            isSeedingMock={isSeedingMock}
            isClearingMock={isClearingMock}
            wildcardEmailOrPhone={wildcardEmailOrPhone}
            setWildcardEmailOrPhone={setWildcardEmailOrPhone}
            wildcardTeamName={wildcardTeamName}
            setWildcardTeamName={setWildcardTeamName}
            isAssigningWildcard={isAssigningWildcard}
            publishFeeAmount={publishFeeAmount}
            handlePublish={publishFeeAmount > 0 ? handlePayPublishFee : handlePublish}
            handleOpenLockModal={handleOpenLockModal}
            handleUpdateStatus={handleUpdateStatus}
            handleSeedMockData={handleSeedMockData}
            handleClearMockData={handleClearMockData}
            handleAssignWildcard={handleAssignWildcard}
            onCopyInviteLink={() => {
              navigator.clipboard.writeText(inviteLink);
              toast.success(tournament.visibility === 'PRIVATE' ? 'Đã sao chép link đăng ký riêng tư!' : 'Đã sao chép link đăng ký công khai!');
            }}
          />
        )}

        {/* TAB 5: BRACKET — dùng BracketTab component (đã có visual tree đẹp + organizer mode) */}
        {activeTab === 'bracket' && tournament && (
          <BracketTab
            tournament={tournament}
            bracket={bracket}
            selectedDivisionId={selectedDivisionId}
            participants={participants}
            isGeneratingBracket={isGeneratingBracket}
            handleGenerateBracket={handleGenerateBracket}
            handleOpenScheduling={handleOpenScheduling}
            handleOpenRoundModal={handleOpenRoundModal}
            isLimitEnabled={isLimitEnabled}
            setIsLimitEnabled={setIsLimitEnabled}
            maxParticipants={maxParticipants}
            setMaxParticipants={setMaxParticipants}
            matchType={matchType}
            setMatchType={setMatchType}
            setsToWin={setsToWin}
            setSetsToWin={setSetsToWin}
            pointsPerSet={pointsPerSet}
            setPointsPerSet={setPointsPerSet}
            winByTwo={winByTwo}
            setWinByTwo={setWinByTwo}
            maxDeucePoints={maxDeucePoints}
            setMaxDeucePoints={setMaxDeucePoints}
            superTiebreakEnabled={superTiebreakEnabled}
            setSuperTiebreakEnabled={setSuperTiebreakEnabled}
            superTiebreakSetIndex={superTiebreakSetIndex}
            setSuperTiebreakSetIndex={setSuperTiebreakSetIndex}
            superTiebreakPoints={superTiebreakPoints}
            setSuperTiebreakPoints={setSuperTiebreakPoints}
            isSavingConfig={isSavingConfig}
            handleSaveMatchConfig={handleSaveMatchConfig}
          />
        )}

        {/* TAB 6: FINANCE & PAYOUT */}
        {activeTab === 'finance' && tournament && (
          <FinanceTab
            tournament={tournament}
            participants={participants}
            entryFee={entryFee}
            setEntryFee={setEntryFee}
            platformFeePerPlayer={platformFeePerPlayer}
            isSavingConfig={isSavingConfig}
            handleSaveFinanceConfig={handleSaveFinanceConfig}
            currentPlatformFeePerPlayer={platformFeePerPlayer}
            handlePayPlatformFee={handlePayPlatformFee}
            isPayingPlatformFee={isPayingPlatformFee}
          />
        )}

        {activeTab === 'permissions' && (
          <PermissionsTab
            id={id}
            tournament={tournament}
            referees={referees}
            refereeEmail={refereeEmail}
            setRefereeEmail={setRefereeEmail}
            isAddingReferee={isAddingReferee}
            onAddReferee={handleAddReferee}
          />
        )}

      </div>

      {/* STAGE DETAILS / OVERRIDE CONFIG MODAL */}
      {selectedStage && selectedRoundNumber !== null && (
        <Modal open={!!selectedStage} onOpenChange={(open) => { if (!open) { setSelectedStage(null); setSelectedRoundNumber(null); } }}>
          <ModalContent className="bg-white rounded-2xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Cấu hình riêng cho vòng {(() => {
                  const getRoundLabelText = (roundNum: number, maxRound: number) => {
                    const ri = roundNum - 1;
                    const fromEnd = maxRound - 1 - ri;
                    if (fromEnd === 0) return 'Chung kết';
                    if (fromEnd === 1) return 'Bán kết';
                    if (fromEnd === 2) return 'Tứ kết';
                    if (fromEnd === 3) return 'Vòng 16';
                    return `Vòng ${roundNum}`;
                  };
                  const matches = selectedStage.groups?.flatMap(g => g.matches) || [];
                  const maxRound = matches.length > 0 ? Math.max(...matches.map(m => m.roundNumber)) : 0;
                  return getRoundLabelText(selectedRoundNumber, maxRound);
                })()}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số set tối đa</label>
                    <select
                      value={stageMaxSets}
                      onChange={(e) => setStageMaxSets(Number(e.target.value))}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                    >
                      <option value={1}>1 set</option>
                      <option value={3}>Thắng 2 set</option>
                      <option value={5}>Thắng 3 set</option>
                    </select>
                  </div>

                  <Input
                    label="Số điểm mỗi set"
                    type="number"
                    value={stagePointsPerSet}
                    onChange={(e) => setStagePointsPerSet(Number(e.target.value))}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={stageWinBy2Points}
                      onChange={(e) => setStageWinBy2Points(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">Yêu cầu thắng cách biệt 2 điểm</span>
                  </label>

                  {stageWinBy2Points && (
                    <Input
                      label="Điểm chạm tối đa khi hòa 2 điểm"
                      type="number"
                      value={stageMaxDeucePoints}
                      onChange={(e) => setStageMaxDeucePoints(Number(e.target.value))}
                      placeholder="Ví dụ: 15 (chạm 15 thắng luôn không cần cách biệt 2)"
                      className="bg-white h-9 text-sm"
                    />
                  )}
                </div>

                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={stageSuperTiebreakEnabled}
                      onChange={(e) => setStageSuperTiebreakEnabled(e.target.checked)}
                      className="rounded text-blue-650 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">Set quyết định dùng siêu tie-break</span>
                  </label>

                  {stageSuperTiebreakEnabled && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <Input
                        label="Áp dụng ở set thứ"
                        type="number"
                        value={stageSuperTiebreakSetIndex}
                        onChange={(e) => setStageSuperTiebreakSetIndex(Number(e.target.value))}
                        className="bg-white h-9 text-xs"
                      />
                      <Input
                        label="Số điểm thắng siêu tie-break"
                        type="number"
                        value={stageSuperTiebreakPoints}
                        onChange={(e) => setStageSuperTiebreakPoints(Number(e.target.value))}
                        placeholder="Thường là 10 điểm"
                        className="bg-white h-9 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => { setSelectedStage(null); setSelectedRoundNumber(null); }}
                  disabled={isSavingStage}
                  className="border-slate-200 text-slate-650 font-semibold hover:bg-slate-50"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSaveStageDetails}
                  disabled={isSavingStage}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
                >
                  {isSavingStage ? 'Đang lưu...' : 'Lưu cài đặt'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* LOCK LIST & BILLING MODAL */}
      {isLockModalOpen && lockSummary && (
        <Modal open={isLockModalOpen} onOpenChange={(open) => { if (!open) setIsLockModalOpen(false); }}>
          <ModalContent className="bg-white rounded-2xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Chốt danh sách vận động viên & tính phí
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-5 mt-4">
              <div className="bg-amber-50 text-amber-900 p-4 rounded-xl border border-amber-200 flex gap-3 text-xs leading-relaxed font-semibold">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-950">Hành động không thể hoàn tác!</p>
                  <p className="mt-1">Khi chốt danh sách VĐV, giải đấu sẽ khóa đăng ký, tự động sinh sơ đồ đấu loại trực tiếp và tính phí sàn.</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y text-sm bg-white overflow-hidden shadow-sm">
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500 font-semibold">Tổng số đội đăng ký</span>
                  <span className="font-bold text-slate-900">{lockSummary.totalParticipants} đội</span>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500 font-semibold">Tổng số VĐV thực tế</span>
                  <span className="font-bold text-slate-900">{lockSummary.totalPlayers} người chơi</span>
                </div>
                <div className="p-3.5 flex justify-between">
                  <span className="text-slate-500 font-semibold">Đơn giá phí sàn / VĐV</span>
                  <span className="font-bold text-slate-900">{lockSummary.platformFeePerPlayer.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="p-3.5 flex justify-between bg-blue-50">
                  <span className="text-blue-900 font-black">Tổng phí sàn nền tảng</span>
                  <span className="font-black text-emerald-600 text-base">{lockSummary.totalPlatformFee.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsLockModalOpen(false)}
                  disabled={isLocking}
                  className="border-slate-200 text-slate-650 font-medium animate-none hover:bg-slate-50"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleConfirmLock}
                  disabled={isLocking}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5"
                >
                  {isLocking ? 'Đang khóa...' : 'Xác nhận chốt danh sách'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* SCHEDULING MATCH MODAL */}
      {selectedMatch && (
        <Modal open={!!selectedMatch} onOpenChange={(open) => { if (!open) setSelectedMatch(null); }}>
          <ModalContent className="bg-white rounded-2xl p-6 max-w-lg">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Sắp xếp Lịch thi đấu - Trận {selectedMatch.matchOrder} Vòng {selectedMatch.roundNumber}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Tên sân thi đấu</label>
                  <Input
                    placeholder="Ví dụ: Sân số 1, Sân trung tâm..."
                    value={matchCourtName}
                    onChange={(e) => setMatchCourtName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Địa chỉ / Vị trí sân</label>
                  <Input
                    placeholder="Ví dụ: 123 Nguyễn Du, Quận 1..."
                    value={matchCourtAddress}
                    onChange={(e) => setMatchCourtAddress(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              <DateTimePicker
                label="Chọn giờ ngày bắt đầu thi đấu"
                value={matchScheduledAt}
                onChange={setMatchScheduledAt}
              />

              {/* CUSTOM RULES CHECKBOX */}
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="isCustomMatchConfig"
                    checked={isCustomMatchConfig}
                    onChange={(e) => setIsCustomMatchConfig(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-350 cursor-pointer focus:ring-blue-500"
                  />
                  <label htmlFor="isCustomMatchConfig" className="flex flex-col cursor-pointer select-none">
                    <span className="text-xs font-bold text-slate-800">Cấu hình riêng cho trận đấu này</span>
                    <span className="text-[10px] text-slate-500 font-semibold">Tự động kế thừa luật của vòng đấu hoặc mặc định hình thức thi đấu nếu không chọn</span>
                  </label>
                </div>

                {isCustomMatchConfig && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-650 uppercase">Số set chạm thắng</label>
                      <select
                        value={matchSetsToWin}
                        onChange={(e) => setMatchSetsToWin(Number(e.target.value))}
                        className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs h-10 font-bold"
                      >
                        <option value={1}>1 set</option>
                        <option value={2}>Thắng 2 set</option>
                        <option value={3}>Thắng 3 set</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-650 uppercase">Điểm mỗi set</label>
                      <Input
                        type="number"
                        value={matchPointsPerSet}
                        onChange={(e) => setMatchPointsPerSet(Number(e.target.value))}
                        className="bg-white text-xs h-10 font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2 mt-2">
                      <input
                        type="checkbox"
                        id="matchDeuceEnabled"
                        checked={matchDeuceEnabled}
                        onChange={(e) => setMatchDeuceEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-650 rounded cursor-pointer"
                      />
                      <label htmlFor="matchDeuceEnabled" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        Yêu cầu cách biệt 2 điểm
                      </label>
                    </div>
                    {matchDeuceEnabled && (
                      <div className="flex flex-col gap-1.5 sm:col-span-2 border-t pt-3.5 mt-1">
                        <label className="text-xs font-bold text-slate-650 uppercase">Điểm tối đa của set khi hòa 2 điểm</label>
                        <Input
                          type="number"
                          value={matchMaxPoints}
                          onChange={(e) => setMatchMaxPoints(Number(e.target.value))}
                          placeholder="Ví dụ: 30"
                          className="bg-white text-xs h-10 max-w-xs font-bold"
                        />
                        <p className="text-[10px] text-slate-550 font-semibold leading-relaxed">
                          Khi deuce kéo dài, đội chạm mốc điểm giới hạn này trước sẽ thắng set đấu đó (mặc định là 30).
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMatch(null)}
                  disabled={isScheduling}
                  className="border-slate-200 text-slate-650 font-medium hover:bg-slate-50"
                >
                  Đóng
                </Button>
                <Button
                  onClick={handleSaveSchedule}
                  disabled={isScheduling}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
                >
                  {isScheduling ? 'Đang cập nhật...' : 'Lưu sắp xếp'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* Delete Division Confirm Modal */}
      {divisionPendingDelete && (
        <Modal open={!!divisionPendingDelete} onOpenChange={(open) => !open && setDivisionPendingDelete(null)}>
          <ModalContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border">
            <ModalHeader>
              <ModalTitle className="text-lg font-black text-slate-900">
                Xóa hình thức thi đấu?
              </ModalTitle>
            </ModalHeader>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-900">
                  Xác nhận xóa hình thức &quot;{divisionPendingDelete.name}&quot;.
                </p>
                <p className="mt-1 text-xs text-red-700">
                  Hành động này chỉ được phép khi hình thức chưa có người chơi đang hoạt động.
                </p>
              </div>
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDivisionPendingDelete(null)}
                  disabled={isDeletingDivision}
                  className="border-slate-200 text-slate-650 hover:bg-slate-50 font-bold"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmDeleteDivision}
                  disabled={isDeletingDivision}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  {isDeletingDivision ? 'Đang xóa...' : 'Xóa hình thức'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* Create Division Modal */}
      {isCreateDivisionModalOpen && (
        <Modal open={isCreateDivisionModalOpen} onOpenChange={setIsCreateDivisionModalOpen}>
          <ModalContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border">
            <ModalHeader>
              <ModalTitle className="text-lg font-black text-slate-900">
                Thêm hình thức đăng ký mới
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-900">
                  Tên hình thức sẽ tự động được tạo dựa trên loại thi đấu bạn chọn.
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Thể thức thi đấu</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'MALE_SINGLES', label: 'Đơn Nam', icon: '1' },
                    { value: 'FEMALE_SINGLES', label: 'Đơn Nữ', icon: '1' },
                    { value: 'MALE_DOUBLES', label: 'Đôi Nam', icon: '2' },
                    { value: 'FEMALE_DOUBLES', label: 'Đôi Nữ', icon: '2' },
                    { value: 'MIXED_DOUBLES', label: 'Nam Nữ', icon: 'M' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewDivisionMatchType(option.value)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        newDivisionMatchType === option.value
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                        newDivisionMatchType === option.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {option.icon}
                      </span>
                      <span className="block text-sm font-black text-slate-900">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Loại giải đấu</label>
                <select
                  value={newDivisionBracketType}
                  onChange={(e) => setNewDivisionBracketType(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-11"
                >
                  <option value="SINGLE_ELIMINATION">Loại trực tiếp</option>
                  <option value="DOUBLE_ELIMINATION">Nhánh thắng nhánh thua</option>
                  <option value="ROUND_ROBIN">Vòng tròn</option>
                </select>
              </div>

              {divisions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900">Hình thức đã có:</p>
                  <div className="space-y-1">
                    {divisions.map((div) => (
                      <div key={div.id} className="text-xs text-amber-800 flex items-center gap-1.5">
                        <span>{div.name || getFormatLabel(div.matchType || '', div.genderRestriction)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDivisionModalOpen(false);
                    setNewDivisionMatchType('MALE_DOUBLES');
                    setNewDivisionBracketType('SINGLE_ELIMINATION');
                  }}
                  disabled={isCreatingDivision}
                  className="border-slate-200 text-slate-650 hover:bg-slate-50 font-bold"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleCreateDivision}
                  disabled={isCreatingDivision}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
                >
                  {isCreatingDivision ? 'Đang tạo...' : 'Khởi tạo'}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

    </div>
  );
}
