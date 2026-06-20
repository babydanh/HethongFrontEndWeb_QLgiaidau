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
import BracketTab from '@/app/(public)/tournaments/[id]/components/BracketTab';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { TournamentStepper } from './components/TournamentStepper';

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
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'config' | 'registration' | 'bracket' | 'finance'>('basic');
  const [basicSubTab, setBasicSubTab] = useState<'general' | 'branding' | 'prizes' | 'contact'>('general');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [isCreateDivisionModalOpen, setIsCreateDivisionModalOpen] = useState(false);
  const [newDivisionMatchType, setNewDivisionMatchType] = useState('MALE_DOUBLES');
  const [newDivisionBracketType, setNewDivisionBracketType] = useState('SINGLE_ELIMINATION');
  const [isCreatingDivision, setIsCreatingDivision] = useState(false);
  const [divisionPendingDelete, setDivisionPendingDelete] = useState<Division | null>(null);
  const [isDeletingDivision, setIsDeletingDivision] = useState(false);

  // Basic info tab form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [contactInfo, setContactInfo] = useState({ phone: '', email: '' });
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
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Stage details modal states
  const [selectedStage, setSelectedStage] = useState<BracketStage | null>(null);
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
  const [matchScheduledAt, setMatchScheduledAt] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPayingPlatformFee, setIsPayingPlatformFee] = useState(false);
  const [isPayingPublishFee, setIsPayingPublishFee] = useState(false);
  const [publishFeeAmount, setPublishFeeAmount] = useState(0);
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
        setContactInfo({
          phone: t.contactInfo?.phone || '',
          email: t.contactInfo?.email || '',
        });
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
            return requestedDivisionId;
          }
          return res.data.some((division) => division.id === current) ? current : res.data[0].id;
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
        setCourts(vRes.data.courts);
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
          setPublishFeeAmount(resolvePublishFeeAmount(t, feesRes.data));
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

  useEffect(() => {
    setPublishFeeAmount(resolvePublishFeeAmount(tournament, feesConfig));
  }, [tournament, feesConfig, resolvePublishFeeAmount]);

  // Watch selectedDivisionId - khi user click division, load config của division đó
  useEffect(() => {
    if (selectedDivisionId && divisions.length > 0) {
      const selected = divisions.find(d => d.id === selectedDivisionId);
      if (selected) {
        // Update form fields từ selected division
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
      }
    }
  }, [selectedDivisionId, divisions]);

  // refetchDivisionData đã được khai báo ở trên (trước handleGenerateBracket)
  // useEffect dùng lại cùng tham chiếu
  useEffect(() => {
    refetchDivisionData();
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
      toast.success('Lưu thông tin cơ bản thành công!');
      fetchTournamentData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingConfig(false);
    }
  };

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

      const data = {
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
      await tournamentsApi.deleteTournament(id);
      toast.success('Đã xóa giải đấu thành công!');
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
    try {
      setIsAssigningWildcard(true);
      await tournamentsApi.assignReservedSlot(id, wildcardEmailOrPhone.trim(), wildcardTeamName.trim());
      toast.success('Đã gán suất đặc cách Wildcard thành công!');
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

  const handleOpenStageModal = (stage: BracketStage) => {
    setSelectedStage(stage);
    setStageVenueId(stage.venueId || '');
    setStageScheduledDate(stage.scheduledDate ? stage.scheduledDate : '');
    setStageNotificationNote(stage.notificationNote || '');
    
    // Populate matchSettings
    setStageMaxSets(stage.matchSettings?.maxSets || 3);
    setStagePointsPerSet(stage.matchSettings?.pointsPerSet || 21);
    setStageWinBy2Points(stage.matchSettings?.winBy2Points !== undefined ? stage.matchSettings.winBy2Points : true);
    setStageMaxDeucePoints(stage.matchSettings?.maxDeucePoints || 30);
    setStageSuperTiebreakEnabled(stage.matchSettings?.superTiebreakEnabled || false);
    setStageSuperTiebreakSetIndex(stage.matchSettings?.superTiebreakSetIndex || 3);
    setStageSuperTiebreakPoints(stage.matchSettings?.superTiebreakPoints || 10);
  };

  const handleSaveStageDetails = async () => {
    if (!selectedStage) return;
    try {
      setIsSavingStage(true);
      await tournamentsApi.updateStage(selectedStage.id, {
        venueId: stageVenueId === '' ? null : stageVenueId,
        scheduledDate: stageScheduledDate === '' ? null : stageScheduledDate,
        notificationNote: stageNotificationNote === '' ? null : stageNotificationNote,
        matchSettings: {
          maxSets: stageMaxSets,
          pointsPerSet: stagePointsPerSet,
          winBy2Points: stageWinBy2Points,
          maxDeucePoints: stageWinBy2Points ? stageMaxDeucePoints : null,
          superTiebreakEnabled: stageSuperTiebreakEnabled,
          superTiebreakSetIndex: stageSuperTiebreakEnabled ? stageSuperTiebreakSetIndex : null,
          superTiebreakPoints: stageSuperTiebreakEnabled ? stageSuperTiebreakPoints : null,
        }
      });
      toast.success('Cập nhật thông tin vòng đấu thành công!');
      setSelectedStage(null);
      fetchTournamentData();
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
    setMatchCourtId(match.courtName ? (courts.find(c => c.courtName === match.courtName)?.id || '') : '');
    setMatchScheduledAt(match.scheduledAt ? match.scheduledAt.substring(0, 16) : '');
  };

  const handleSaveSchedule = async () => {
    if (!selectedMatch) return;
    try {
      setIsScheduling(true);
      await tournamentsApi.updateMatchSchedule(selectedMatch.id, {
        courtId: matchCourtId === '' ? null : matchCourtId,
        scheduledAt: matchScheduledAt === '' ? null : new Date(matchScheduledAt).toISOString(),
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
                      onClick={() => setSelectedDivisionId(div.id)}
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
            onClick={() => setActiveTab('config')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'config' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Cấu Hình Thi Đấu
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
            <GitBranch className="w-3.5 h-3.5" /> Sơ đồ Bracket
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'finance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Tài Chính & Payout
          </button>
        </div>

        {/* TAB 1: BASIC INFO */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="border-b pb-4">
              <h2 className="text-xl font-black text-slate-900">Thông tin cơ bản giải đấu</h2>
              <p className="text-xs text-slate-450 mt-1 font-semibold">Quản lý tên, thương hiệu, mô tả và cấu hình liên hệ của giải đấu.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
              {/* LEFT SIDEBAR: Table of Contents */}
              <div className="flex flex-row md:flex-col gap-1 md:gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4">
                <button
                  type="button"
                  onClick={() => setBasicSubTab('general')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap md:w-full ${
                    basicSubTab === 'general'
                      ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Thông tin chung</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBasicSubTab('branding')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap md:w-full ${
                    basicSubTab === 'branding'
                      ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Hình ảnh & Banner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBasicSubTab('prizes')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap md:w-full ${
                    basicSubTab === 'prizes'
                      ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span>Cơ cấu giải thưởng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBasicSubTab('contact')}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap md:w-full ${
                    basicSubTab === 'contact'
                      ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-600'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Liên hệ & Mã mời</span>
                </button>
              </div>

              {/* RIGHT CONTENT PANE */}
              <div className="md:col-span-3 space-y-6 min-h-[300px]">
                {basicSubTab === 'general' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="font-extrabold text-slate-850 text-base">Thông tin chung</h3>
                      <p className="text-xs text-slate-450 mt-0.5 font-semibold">Các thông tin cơ bản để định danh giải đấu trên hệ thống.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input
                        label="Tên giải đấu"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">Bộ môn thi đấu</label>
                        <select
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 border-t pt-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">Chế độ hiển thị (Visibility)</label>
                        <select
                          value={visibility}
                          onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
                          className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="PUBLIC">Công khai (Hiển thị trên danh sách tìm kiếm)</option>
                          <option value="PRIVATE">Riêng tư (Ẩn, chỉ đăng ký qua link mời)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t pt-5">
                      <RichTextEditor
                        label="Mô tả giải đấu"
                        value={description}
                        onChange={setDescription}
                        placeholder="Tóm tắt thể thức, đối tượng tham gia..."
                      />
                    </div>
                  </div>
                )}

                {basicSubTab === 'branding' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="font-extrabold text-slate-850 text-base">Hình ảnh & Banner</h3>
                      <p className="text-xs text-slate-450 mt-0.5 font-semibold">Tải lên các hình ảnh quảng bá giải đấu của bạn.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {/* Logo */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo giải đấu</label>
                        <div className="flex gap-2">
                          <input
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="Nhập URL logo hoặc chọn file..."
                            className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors duration-200"
                          />
                          <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  toast.loading('Đang tải logo giải đấu...', { id: 'logo-upload' });
                                  const res = await uploadApi.uploadImage(file);
                                  if (res && res.url) {
                                    setLogoUrl(res.url);
                                    await tournamentsApi.updateTournament(id, { logoUrl: res.url });
                                    if (tournament.parentId) {
                                      await tournamentsApi.updateParentTournament(tournament.parentId, { logoUrl: res.url });
                                    }
                                    toast.success('Đã tải logo thành công!', { id: 'logo-upload' });
                                    fetchTournamentData();
                                  }
                                } catch (err) {
                                  toast.error(getErrorMessage(err), { id: 'logo-upload' });
                                }
                              }}
                            />
                            Chọn file
                          </label>
                        </div>
                        {logoUrl ? (
                          <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white flex items-center justify-center p-2 mt-2">
                            <img src={logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                              Logo
                            </div>
                          </div>
                        ) : (
                          <div className="w-28 h-28 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 mt-2 text-[10px] font-bold">
                            <span>Chưa có logo</span>
                          </div>
                        )}
                      </div>

                      {/* Banner */}
                      <div className="flex flex-col gap-2 border-t pt-5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ảnh Banner chính</label>
                        <div className="flex gap-2">
                          <input
                            value={bannerUrl}
                            onChange={(e) => setBannerUrl(e.target.value)}
                            placeholder="Nhập URL banner hoặc chọn file..."
                            className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors duration-200"
                          />
                          <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  toast.loading('Đang tải ảnh banner...', { id: 'banner-upload' });
                                  const res = await uploadApi.uploadImage(file);
                                  if (res && res.url) {
                                    setBannerUrl(res.url);
                                    await tournamentsApi.updateTournament(id, { bannerUrl: res.url });
                                    await tournamentsApi.addTournamentGalleryImage(id, res.url);
                                    toast.success('Đã tải ảnh banner và thêm vào album thành công!', { id: 'banner-upload' });
                                    fetchTournamentData();
                                  }
                                } catch (err) {
                                  toast.error(getErrorMessage(err), { id: 'banner-upload' });
                                }
                              }}
                            />
                            Chọn file
                          </label>
                        </div>
                        {bannerUrl ? (
                          <div className="relative aspect-[21/9] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white mt-2">
                            <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                              Xem trước Banner
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[21/9] w-full rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 mt-2 text-[10px] font-bold">
                            <span>Chưa có banner</span>
                          </div>
                        )}
                      </div>

                      {/* Album ảnh */}
                      <div className="space-y-4 border-t pt-5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-semibold">Album ảnh bổ sung (Gallery)</label>
                        
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nhập URL ảnh khác..."
                            value={newGalleryUrl}
                            onChange={(e) => setNewGalleryUrl(e.target.value)}
                            className="flex-grow text-slate-800"
                          />
                          <label className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs flex items-center justify-center gap-1.5 transition-colors select-none shrink-0 h-11 shadow-sm mt-1">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  setIsAddingImage(true);
                                  toast.loading('Đang tải ảnh lên Cloudinary...', { id: 'gallery-upload' });
                                  const res = await uploadApi.uploadImage(file);
                                  if (res && res.url) {
                                    await tournamentsApi.addTournamentGalleryImage(id, res.url);
                                    toast.success('Đã tải ảnh lên và thêm vào bộ sưu tập!', { id: 'gallery-upload' });
                                    fetchTournamentData();
                                  }
                                } catch (err) {
                                  toast.error(getErrorMessage(err), { id: 'gallery-upload' });
                                } finally {
                                  setIsAddingImage(false);
                                }
                              }}
                              disabled={isAddingImage}
                            />
                            Chọn file
                          </label>
                          <Button
                            onClick={handleAddGalleryImage}
                            disabled={isAddingImage || !newGalleryUrl.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs shrink-0 shadow-sm mt-1 h-11"
                          >
                            {isAddingImage ? 'Đang thêm...' : 'Thêm URL'}
                          </Button>
                        </div>

                        {tournament.galleryImages && tournament.galleryImages.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[260px] p-2 bg-white border rounded-xl">
                            {tournament.galleryImages.map((imgUrl, index) => (
                              <div key={index} className="relative group border rounded-lg overflow-hidden aspect-video bg-slate-50">
                                <img src={imgUrl} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGalleryImage(index)}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                                >
                                  <span className="bg-rose-600 hover:bg-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-md">
                                    Xóa ảnh
                                  </span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed rounded-xl p-8 text-center text-slate-400 bg-white">
                            <p className="text-xs font-semibold italic">Chưa có ảnh nào trong album.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {basicSubTab === 'prizes' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="font-extrabold text-slate-850 text-base">Cơ cấu giải thưởng</h3>
                      <p className="text-xs text-slate-450 mt-0.5 font-semibold">Thông tin chi tiết về phần thưởng của giải đấu.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <RichTextEditor
                        label="Mô tả giải thưởng"
                        value={prizeDescription}
                        onChange={setPrizeDescription}
                        placeholder="Cúp, cờ lưu niệm, tiền thưởng cho các thứ hạng..."
                      />
                    </div>
                  </div>
                )}

                {basicSubTab === 'contact' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="font-extrabold text-slate-850 text-base">Liên hệ & Mã mời</h3>
                      <p className="text-xs text-slate-450 mt-0.5 font-semibold">Thông tin liên hệ của Ban tổ chức và quản lý lời mời.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input
                        label="Số điện thoại liên hệ"
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                        placeholder="0987654321"
                      />
                      <Input
                        label="Email liên hệ"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                        placeholder="btc@tournahub.vn"
                      />
                    </div>

                    {/* Invite Code Section */}
                    {tournament.status !== 'DRAFT' && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 border-t pt-5 mt-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mã mời đăng ký nhanh</p>
                            <p className="text-base font-black text-blue-600 tracking-widest">{tournament.inviteCode}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(tournament.inviteCode || '');
                                toast.success('Đã sao chép mã mời!');
                              }}
                              className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
                            >
                              Copy Mã
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleRegenerateInviteCode}
                              className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Tạo lại mã mời
                            </Button>
                          </div>
                        </div>

                        {visibility === 'PRIVATE' && (
                          <div className="flex items-center gap-3 border p-3.5 rounded-xl bg-white mt-2">
                            <LinkIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <div className="flex-grow min-w-0">
                              <p className="text-xs text-slate-455 font-bold uppercase tracking-wider">Đường dẫn đăng ký riêng tư (Private Invite Link)</p>
                              <p className="text-sm font-semibold text-slate-800 truncate select-all">
                                {`${window.location.origin}/tournaments/${tournament.id}/register?invite=${tournament.inviteCode}`}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/tournaments/${tournament.id}/register?invite=${tournament.inviteCode}`);
                                toast.success('Đã sao chép link đăng ký riêng tư!');
                              }}
                              className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                            >
                              Copy Link
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Global Actions in Tab */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div>
                {tournament.status === 'DRAFT' && (
                  <Button
                    onClick={handleDeleteTournament}
                    disabled={isDeleting}
                    variant="outline"
                    className="border-rose-250 hover:bg-rose-50 text-rose-600 font-bold px-6"
                  >
                    {isDeleting ? 'Đang xóa...' : 'Xóa giải đấu nháp'}
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSaveBasicInfo}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-500/10"
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu thông tin'}
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE & LOCATIONS */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Lịch thi đấu & Địa điểm</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-3.5 bg-slate-50 border p-5 rounded-2xl">
                <h4 className="font-bold text-slate-800 text-sm border-b pb-2 mb-1">Địa điểm thi đấu</h4>
                
                <Input
                  label="Tên sân / Địa điểm thi đấu"
                  placeholder="Ví dụ: Sân Cầu Lông Sunrise"
                  value={customVenueName}
                  onChange={(e) => setCustomVenueName(e.target.value)}
                  className="bg-white"
                />
                
                <Input
                  label="Địa chỉ chi tiết (Số nhà, Tên đường)"
                  placeholder="Ví dụ: 123 Đường Nguyễn Văn Linh"
                  value={customVenueAddress}
                  onChange={(e) => setCustomVenueAddress(e.target.value)}
                  className="bg-white"
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Tỉnh / Thành phố *</label>
                  <select
                    value={provinceCode}
                    onChange={(e) => {
                      setProvinceCode(e.target.value);
                      setDistrictCode('');
                      setWardCode('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                  >
                    <option value="">-- Tỉnh/Thành phố --</option>
                    {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Quận / Huyện</label>
                    <select
                      value={districtCode}
                      onChange={(e) => {
                        setDistrictCode(e.target.value);
                        setWardCode('');
                      }}
                      disabled={!provinceCode}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 disabled:opacity-50"
                    >
                      <option value="">-- Quận/Huyện --</option>
                      {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Phường / Xã</label>
                    <select
                      value={wardCode}
                      onChange={(e) => setWardCode(e.target.value)}
                      disabled={!districtCode}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 disabled:opacity-50"
                    >
                      <option value="">-- Phường/Xã --</option>
                      {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <DateTimePicker
                  label="Ngày khai mạc giải đấu"
                  value={startDate}
                  onChange={setStartDate}
                />
                <DateTimePicker
                  label="Ngày bế mạc / kết thúc giải đấu"
                  value={endDate}
                  onChange={setEndDate}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t pt-4">
              <DateTimePicker
                label="Ngày mở đăng ký"
                value={registrationStartDate}
                onChange={setRegistrationStartDate}
              />
              <DateTimePicker
                label="Hạn chót đăng ký"
                value={registrationEndDate}
                onChange={setRegistrationEndDate}
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSaveScheduleDetails}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu lịch trình'}
              </Button>
            </div>

            {/* Stage-specific schedule editor */}
            {bracket && bracket.stages && bracket.stages.length > 0 ? (
              <div className="mt-8 border-t pt-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">Chi tiết lịch & địa điểm từng vòng đấu</h3>
                  <p className="text-xs text-slate-400 font-semibold">Tùy biến lịch đấu và địa điểm riêng cho các vòng đặc biệt (như Bán kết/Chung kết).</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-650 font-bold border-b">
                      <tr>
                        <th className="p-3.5">Vòng đấu</th>
                        <th className="p-3.5">Ngày dự kiến</th>
                        <th className="p-3.5">Địa điểm riêng</th>
                        <th className="p-3.5">Thông báo riêng</th>
                        <th className="p-3.5 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {bracket.stages.map((stage) => (
                        <tr key={stage.id} className="hover:bg-slate-50/40">
                          <td className="p-3.5 font-bold">{stage.name}</td>
                          <td className="p-3.5 text-xs font-semibold">
                            {stage.scheduledDate ? new Date(stage.scheduledDate).toLocaleDateString('vi-VN') : 'Kế thừa giải đấu'}
                          </td>
                          <td className="p-3.5 text-xs font-semibold">
                            {venues.find(v => v.id === stage.venueId)?.name || 'Kế thừa giải đấu'}
                          </td>
                          <td className="p-3.5 text-xs text-slate-500 italic truncate max-w-[150px]">
                            {stage.notificationNote || 'Không có'}
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStageModal(stage)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 font-bold text-xs"
                            >
                              Sửa đổi
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-8 border-t pt-6 text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed flex flex-col items-center">
                <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-xs leading-relaxed max-w-sm">
                  Hãy chốt danh sách VĐV ở tab <strong>Đăng ký & Chốt DS</strong> để sinh các Stage vòng đấu, sau đó bạn có thể cấu hình chi tiết lịch trình cho từng vòng đấu.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MATCH CONFIGURATION */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Cấu hình luật chơi</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2 bg-slate-50 border p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Giới hạn số đội đăng ký</label>
                  <input
                    type="checkbox"
                    checked={isLimitEnabled}
                    onChange={(e) => setIsLimitEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
                {isLimitEnabled && (
                  <Input
                    label="Số lượng đội đăng ký tối đa"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className="bg-white text-xs mt-1"
                  />
                )}
                {!isLimitEnabled && (
                  <p className="text-xs font-semibold text-slate-400 mt-2">Không giới hạn số lượng đăng ký tham gia giải đấu.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 bg-slate-50 border p-4 rounded-xl">
                <label className="text-sm font-semibold text-slate-700">Hình thức / Thể loại thi đấu</label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-11"
                >
                  <option value="MALE_SINGLES">Đơn Nam</option>
                  <option value="FEMALE_SINGLES">Đơn Nữ</option>
                  <option value="MALE_DOUBLES">Đôi Nam</option>
                  <option value="FEMALE_DOUBLES">Đôi Nữ</option>
                  <option value="MIXED_DOUBLES">Đôi Nam Nữ (Mixed Doubles)</option>
                </select>
              </div>
            </div>

            {/* Sport Rules Card */}
            <div className="bg-slate-50 rounded-xl border p-5 space-y-4">
              <h4 className="font-bold text-slate-800 border-b pb-2">Luật tính điểm mặc định</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Số Set chạm thắng</label>
                  <select
                    value={setsToWin}
                    onChange={(e) => setSetsToWin(Number(e.target.value))}
                    className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value={1}>1 Set</option>
                    <option value={2}>2 Set (Best of 3)</option>
                    <option value={3}>3 Set (Best of 5)</option>
                  </select>
                </div>
                <Input
                  label="Điểm mỗi Set"
                  type="number"
                  value={pointsPerSet}
                  onChange={(e) => setPointsPerSet(Number(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="winByTwo_tab"
                  checked={winByTwo}
                  onChange={(e) => setWinByTwo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="winByTwo_tab" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Yêu cầu cách biệt 2 điểm (Deuce)
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSaveMatchConfig}
                disabled={isSavingConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
              >
                {isSavingConfig ? 'Đang lưu...' : 'Lưu cấu hình mặc định'}
              </Button>
            </div>

            {/* Stage-specific configuration */}
            {bracket && bracket.stages && bracket.stages.length > 0 && (
              <div className="mt-8 border-t pt-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">Quy tắc thi đấu linh hoạt cho từng vòng</h3>
                  <p className="text-xs text-slate-400 font-semibold">Tùy biến số set và điểm chạm khác nhau giữa vòng loại (vd: 1 set chạm 11) và vòng chung kết (vd: 3 set chạm 21).</p>
                </div>
                {bracket.stages.map((stage) => (
                  <div key={stage.id} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-bold text-slate-800 text-sm">{stage.name}</h4>
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded border border-blue-100 uppercase">{stage.type}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Số set chạm thắng</label>
                        <select
                          value={stage.roundConfig?.sets_to_win ?? setsToWin}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { sets_to_win: Number(e.target.value) })}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                        >
                          <option value={1}>1 Set</option>
                          <option value={2}>2 Set (Best of 3)</option>
                          <option value={3}>3 Set (Best of 5)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Điểm mỗi set</label>
                        <input
                          type="number"
                          value={stage.roundConfig?.points_per_set ?? pointsPerSet}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { points_per_set: Number(e.target.value) })}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Phương thức tính điểm</label>
                        <select
                          value={stage.roundConfig?.scoring_type ?? 'RALLY_POINT'}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { scoring_type: e.target.value })}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                        >
                          <option value="RALLY_POINT">Rally Point (Trực tiếp)</option>
                          <option value="TRADITIONAL">Traditional (Giao bóng ăn điểm)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Luật Deuce (Cách biệt 2)</label>
                        <select
                          value={stage.roundConfig?.deuce_enabled === false ? 'FALSE' : 'TRUE'}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { deuce_enabled: e.target.value === 'TRUE' })}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                        >
                          <option value="TRUE">Bật</option>
                          <option value="FALSE">Tắt</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-655">Chạm Deuce ở điểm</label>
                        <input
                          type="number"
                          value={stage.roundConfig?.tiebreak_at ?? (stage.roundConfig?.points_per_set ? (stage.roundConfig.points_per_set - 1) : 20)}
                          onChange={(e) => handleUpdateStageRoundConfig(stage.id, { tiebreak_at: Number(e.target.value) })}
                          disabled={stage.roundConfig?.deuce_enabled === false}
                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(!bracket || !bracket.stages || bracket.stages.length === 0) && (
              <div className="mt-8 border-t pt-6">
                <div className="space-y-1 mb-4">
                  <h3 className="text-lg font-black text-slate-900">Quy tắc thi đấu linh hoạt cho từng vòng</h3>
                  <p className="text-xs text-slate-400 font-semibold">Tùy biến số set và điểm chạm khác nhau giữa các vòng đấu.</p>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-full mb-3">
                    <Settings className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Chưa khởi tạo các vòng thi đấu</h4>
                  <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                    Sau khi danh sách vận động viên được chốt ở tab <strong className="text-slate-800">"Đăng ký & Chốt DS"</strong> và sơ đồ thi đấu (Bracket Stages) được khởi tạo, bạn sẽ có thể tùy biến số set thắng và điểm chạm riêng cho từng vòng đấu (ví dụ: Vòng loại đấu 1 set chạm 11, Bán kết/Chung kết đấu 3 set chạm 21).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REGISTRATION & LOCK LIST */}
        {activeTab === 'registration' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
            
            {/* LEFT COLUMN: STATUS & ROSTER (span-2) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Status & Actions Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 text-lg">Trạng thái phát hành giải đấu</h3>
                
                {tournament.status === 'DRAFT' ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400" />
                      <p className="text-xs leading-relaxed font-medium">
                        Giải đấu đang ở trạng thái <strong>Bản nháp (DRAFT)</strong>. Giải đấu chỉ hiển thị đối với bạn. Hãy kiểm tra kỹ thông tin cấu hình, thời gian và địa điểm thi đấu trước khi công bố.
                      </p>
                    </div>
                    <Button
                      onClick={handlePublish}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full md:w-auto flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Công bố giải đấu (Publish)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-emerald-950 text-sm">Giải đấu đã được công bố!</p>
                          <p className="text-emerald-700 text-xs mt-1">Người chơi có thể đăng ký tài khoản và truy cập link để tham gia.</p>
                        </div>
                      </div>
                      
                      {/* Lock list button */}
                      {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'REGISTRATION_CLOSED') && (
                        <Button
                          onClick={handleOpenLockModal}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                        >
                          <Lock className="w-4 h-4" /> Chốt danh sách & Sinh Bracket
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 border p-3.5 rounded-xl bg-slate-50/50">
                      <LinkIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                          {tournament.visibility === 'PRIVATE' ? 'Đường dẫn đăng ký riêng tư' : 'Đường dẫn đăng ký công khai'}
                        </p>
                        <p className="text-sm font-semibold text-slate-800 truncate select-all">{inviteLink}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          toast.success(tournament.visibility === 'PRIVATE' ? 'Đã sao chép link đăng ký riêng tư!' : 'Đã sao chép link đăng ký công khai!');
                        }}
                        className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Roster / Participant List */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Danh sách VĐV đăng ký ({participants.length})</h3>
                    <p className="text-xs text-slate-450 mt-1 font-semibold">BTC duyệt đăng ký của vận động viên trước khi chốt danh sách thi đấu chính thức.</p>
                  </div>
                  {participants.some(p => p.members?.some(m => (m as any).isMock)) && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-[10px]">
                      CHỨA DỮ LIỆU MOCK
                    </Badge>
                  )}
                </div>
                
                {participants.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 bg-slate-50/30 rounded-xl border border-dashed flex flex-col items-center">
                    <Users className="w-10 h-10 mb-3 text-slate-300" />
                    <p className="font-bold text-sm text-slate-700">Chưa có đội hoặc vận động viên nào đăng ký</p>
                    <p className="text-xs text-slate-450 mt-1 max-w-xs">Người chơi đăng ký sẽ xuất hiện tại đây. Bạn cũng có thể dùng bảng bên phải để sinh dữ liệu mock phục vụ thử nghiệm.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {participants.map((p) => {
                      const hasMockMembers = p.members?.some(m => (m as any).isMock || m.role === 'MOCK');
                      return (
                        <div key={p.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0 group hover:bg-slate-50/30 px-2 rounded-xl transition-all duration-200">
                          
                          <div className="space-y-1.5 flex-grow">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-slate-900 text-base">{p.teamName}</h4>
                              {hasMockMembers && (
                                <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                                  Mock
                                </span>
                              )}
                              {p.teamStatus === 'COMPLETE' && (
                                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                                  ĐÃ DUYỆT
                                </span>
                              )}
                              {p.teamStatus === 'PENDING' && (
                                <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider animate-pulse">
                                  CHỜ DUYỆT
                                </span>
                              )}
                              {p.teamStatus === 'WITHDRAWN' && (
                                <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                                  ĐÃ RÚT
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                              <span>Đăng ký: {new Date(p.registeredAt).toLocaleDateString('vi-VN')}</span>
                              <span className="text-slate-300">|</span>
                              <span className="flex items-center gap-1.5">
                                Lệ phí: 
                                {p.isPaid ? (
                                  <span className="text-emerald-600 font-bold bg-emerald-50/50 px-2 py-0.5 rounded-full border border-emerald-100/60">Đã nộp</span>
                                ) : (
                                  <span className="text-amber-600 font-bold bg-amber-50/50 px-2 py-0.5 rounded-full border border-amber-100/60">Chưa nộp</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Team Members info */}
                          <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex gap-2">
                              {p.members?.map((m) => (
                                <div key={m.userId} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold text-[9px] flex items-center justify-center uppercase">
                                    {m.fullName?.substring(0,2) || 'VD'}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-xs font-extrabold text-slate-800 leading-none">{m.fullName}</p>
                                    <p className="text-[9px] text-blue-650 font-black leading-none mt-1">({m.elo?.eloPoints || 1200} ELO)</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Action Buttons for Approvals */}
                            {p.teamStatus === 'PENDING' && (
                              <div className="flex items-center gap-1.5 ml-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus(p.id, 'COMPLETE')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 h-8 shadow-sm flex items-center gap-1 animate-none"
                                >
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (confirm(`Bạn có chắc chắn từ chối đơn đăng ký của đội ${p.teamName}?`)) {
                                      handleUpdateStatus(p.id, 'WITHDRAWN');
                                    }
                                  }}
                                  className="border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs px-3 py-1 h-8 animate-none"
                                >
                                  Từ chối
                                </Button>
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: TESTING & WILDCARDS (span-1) */}
            <div className="space-y-6">
              
              {/* Mock Participant Testing Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-none" /> Bảng thử nghiệm (Mock Data)
                  </h3>
                  <p className="text-xs text-slate-450 mt-1 font-semibold">Tạo danh sách vận động viên ảo để kiểm thử sơ đồ thi đấu (Bracket) trước khi mở đăng ký thật.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách VĐV ảo</label>
                  <Textarea
                    value={mockNamesText}
                    onChange={(e) => setMockNamesText(e.target.value)}
                    placeholder="Mỗi dòng là 1 tên VĐV.&#10;Đánh đôi: Cứ 2 dòng liên tiếp xếp 1 đội.&#10;Ví dụ:&#10;VĐV A&#10;VĐV B"
                    className="h-32 text-xs resize-none font-semibold text-slate-700"
                    disabled={isSeedingMock || isClearingMock}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSeedMockData}
                    disabled={isSeedingMock || isClearingMock || !mockNamesText.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
                  >
                    {isSeedingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Sinh VĐV ảo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearMockData}
                    disabled={isSeedingMock || isClearingMock}
                    className="border-rose-250 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 animate-none"
                  >
                    {isClearingMock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Dọn dẹp
                  </Button>
                </div>
              </div>

              {/* Reserved Slots / Wildcards Direct Assignment */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-600" /> Wildcard / Suất đặc cách
                  </h3>
                  <p className="text-xs text-slate-450 mt-1 font-semibold">Gán trực tiếp khách mời, nhà tài trợ vào danh sách thi đấu. Suất này bỏ qua mọi quy tắc giới hạn trình độ ELO.</p>
                </div>

                <Input
                  label="Tài khoản Baseline (Email hoặc SĐT)"
                  placeholder="partner@baseline.vn hoặc 09xxxx"
                  value={wildcardEmailOrPhone}
                  onChange={(e) => setWildcardEmailOrPhone(e.target.value)}
                  className="bg-white text-xs h-10"
                  disabled={isAssigningWildcard}
                />

                <Input
                  label="Tên đội thi đấu đặc cách"
                  placeholder="Ví dụ: Đội Khách Mời VIP"
                  value={wildcardTeamName}
                  onChange={(e) => setWildcardTeamName(e.target.value)}
                  className="bg-white text-xs h-10"
                  disabled={isAssigningWildcard}
                />

                <Button
                  onClick={handleAssignWildcard}
                  disabled={isAssigningWildcard || !wildcardEmailOrPhone.trim() || !wildcardTeamName.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm animate-none"
                >
                  {isAssigningWildcard ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang gán...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Gán suất Wildcard
                    </>
                  )}
                </Button>
              </div>

            </div>

          </div>
        )}

        {/* TAB 5: BRACKET — dùng BracketTab component (đã có visual tree đẹp + organizer mode) */}
        {activeTab === 'bracket' && tournament && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Nút khởi tạo bracket nếu chưa có */}
            {(!bracket || bracket.stages.length === 0) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center gap-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Sơ đồ thi đấu Bracket</h2>
                  <p className="text-sm text-slate-500">Chưa có sơ đồ. Hãy khởi tạo để bắt đầu.</p>
                </div>
                <Button
                  onClick={handleGenerateBracket}
                  disabled={isGeneratingBracket || !selectedDivisionId || participants.length < 2}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-xl"
                >
                  {isGeneratingBracket ? 'Đang khởi tạo...' : 'Khởi tạo sơ đồ thi đấu'}
                </Button>
                {!selectedDivisionId && (
                  <p className="text-xs text-amber-600 font-semibold">⚠ Vui lòng chọn hình thức thi đấu trước</p>
                )}
                {participants.length < 2 && selectedDivisionId && (
                  <p className="text-xs text-amber-600 font-semibold">⚠ Cần ít nhất 2 đội/VĐV để tạo bracket</p>
                )}
              </div>
            )}
            {/* Visual bracket tree — dùng lại BracketTab đã có, truyền onScheduleMatch cho organizer */}
            <BracketTab
              tournament={tournament}
              divisionId={selectedDivisionId || undefined}
              onScheduleMatch={handleOpenScheduling}
            />
          </div>
        )}

        {/* TAB 6: FINANCE & PAYOUT */}
        {activeTab === 'finance' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-2 mb-4">Quản lý Tài chính</h2>

            {false && tournament?.status === 'REGISTRATION_CLOSED' ? (
              <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed flex flex-col items-center">
                <Lock className="w-12 h-12 text-blue-500 mb-3" />
                <h4 className="font-bold text-slate-850 text-lg">Chưa thanh toán lệ phí sàn</h4>
                <p className="text-slate-500 text-sm mt-1 max-w-sm mb-6">
                  Bạn cần hoàn tất thanh toán lệ phí sàn ({((participants.reduce((sum, p) => sum + (p.members?.length || 0), 0)) * platformFeePerPlayer).toLocaleString('vi-VN')}đ) để xem bảng chi tiết báo cáo và quản lý các giao dịch rút tiền.
                </p>
                <Button 
                  onClick={handlePayPlatformFee}
                  disabled={isPayingPlatformFee}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg"
                >
                  {isPayingPlatformFee ? 'Đang kết nối cổng thanh toán...' : 'Thanh toán lệ phí sàn'}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Lệ phí tham gia giải đấu (VNĐ)"
                    type="number"
                    value={entryFee}
                    onChange={(e) => setEntryFee(Number(e.target.value))}
                    disabled={['UPCOMING', 'IN_PROGRESS', 'COMPLETED'].includes(tournament.status)}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-700">Lệ phí sàn / VĐV (Mặc định)</label>
                    <Badge className="py-2.5 bg-slate-50 border-slate-200 text-slate-700 justify-center font-bold text-sm">
                      {platformFeePerPlayer.toLocaleString('vi-VN')} VNĐ / Người chơi
                    </Badge>
                  </div>
                </div>

                {!['UPCOMING', 'IN_PROGRESS', 'COMPLETED'].includes(tournament.status) && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handleSaveFinanceConfig}
                      disabled={isSavingConfig}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
                    >
                      {isSavingConfig ? 'Đang lưu...' : 'Lưu cài đặt tài chính'}
                    </Button>
                  </div>
                )}

                {/* Financial Report Summary */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-6 mt-6">
                  <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-1.5">
                    <DollarSign className="w-5 h-5 text-blue-600" /> Bảng tổng kết tài chính giải đấu
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng lệ phí thu dự kiến</p>
                      <p className="text-2xl font-black text-slate-800 mt-2">
                        {(entryFee * participants.length).toLocaleString('vi-VN')} VNĐ
                      </p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Tính trên {participants.length} đội đăng ký</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phí nền tảng (Platform Fee)</p>
                      <p className="text-2xl font-black text-red-500 mt-2">
                        {(participants.reduce((sum, p) => sum + (p.members?.length || 0), 0) * platformFeePerPlayer).toLocaleString('vi-VN')} VNĐ
                      </p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Thu cố định 10.000đ/người ({participants.reduce((sum, p) => sum + (p.members?.length || 0), 0)} VĐV)
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
                      <p className="text-xs font-bold text-slate-550 uppercase tracking-wider">Thực nhận của Ban tổ chức</p>
                      <p className="text-2xl font-black text-emerald-600 mt-2">
                        {Math.max(0, (entryFee * participants.length) - (participants.reduce((sum, p) => sum + (p.members?.length || 0), 0) * platformFeePerPlayer)).toLocaleString('vi-VN')} VNĐ
                      </p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Đã khấu trừ toàn bộ phí sàn</p>
                    </div>
                  </div>

                  {/* Payout logic */}
                  {tournament.status === 'COMPLETED' ? (
                    <div className="bg-white border rounded-xl p-5 space-y-4">
                      <h4 className="font-bold text-slate-850 flex items-center gap-1">
                        <Gift className="w-5 h-5 text-purple-600" /> Yêu cầu rút tiền Payout
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Giải đấu đã kết thúc, bạn có thể thực hiện gửi yêu cầu rút tiền thực nhận về tài khoản ngân hàng của ban tổ chức.</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Tên ngân hàng nhận" placeholder="Vietcombank" />
                        <Input label="Số tài khoản ngân hàng" placeholder="1029384756" />
                        <Input label="Tên chủ tài khoản" placeholder="NGUYEN VAN A" />
                      </div>
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full md:w-auto mt-2">
                        Gửi yêu cầu Payout
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-blue-50/50 p-4 rounded-xl border flex gap-3 text-xs leading-relaxed font-semibold text-blue-900">
                      <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p>Hệ thống chỉ mở cổng yêu cầu rút tiền Payout sau khi giải đấu kết thúc (Trạng thái chuyển sang <strong>Đã Kết Thúc - COMPLETED</strong>).</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* STAGE DETAILS / OVERRIDE CONFIG MODAL */}
      {selectedStage && (
        <Modal open={!!selectedStage} onOpenChange={(open) => { if (!open) setSelectedStage(null); }}>
          <ModalContent className="bg-white rounded-2xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Cấu hình riêng cho vòng {selectedStage.name}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Chọn địa điểm riêng</label>
                <select
                  value={stageVenueId}
                  onChange={(e) => setStageVenueId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                >
                  <option value="">-- Kế thừa địa điểm của giải đấu --</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Chọn ngày thi đấu của vòng"
                type="date"
                value={stageScheduledDate}
                onChange={(e) => setStageScheduledDate(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Thông báo đặc biệt cho vòng này</label>
                <Textarea
                  value={stageNotificationNote}
                  onChange={(e) => setStageNotificationNote(e.target.value)}
                  placeholder="Vd: Vòng bán kết dời sang sân trong nhà do trời mưa..."
                  className="h-16 text-sm"
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-emerald-600" /> Thiết lập luật thi đấu nâng cao
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số set tối đa</label>
                    <select
                      value={stageMaxSets}
                      onChange={(e) => setStageMaxSets(Number(e.target.value))}
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                    >
                      <option value={1}>1 Set</option>
                      <option value={3}>3 Set (Thắng 2)</option>
                      <option value={5}>5 Set (Thắng 3)</option>
                    </select>
                  </div>

                  <Input
                    label="Số điểm mỗi Set"
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
                    <span className="text-xs font-semibold text-slate-700">Yêu cầu thắng cách biệt 2 điểm (Deuce)</span>
                  </label>

                  {stageWinBy2Points && (
                    <Input
                      label="Điểm chạm tối đa (Max Deuce Points - Golden Point)"
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
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">Set quyết định Tie-break / Super Tie-break</span>
                  </label>

                  {stageSuperTiebreakEnabled && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <Input
                        label="Áp dụng ở Set thứ"
                        type="number"
                        value={stageSuperTiebreakSetIndex}
                        onChange={(e) => setStageSuperTiebreakSetIndex(Number(e.target.value))}
                        className="bg-white h-9 text-xs"
                      />
                      <Input
                        label="Số điểm thắng Tie-break"
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
                  onClick={() => setSelectedStage(null)}
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
          <ModalContent className="bg-white rounded-2xl p-6">
            <ModalHeader>
              <ModalTitle className="text-xl font-bold text-slate-900">
                Sắp xếp Lịch thi đấu - Trận {selectedMatch.matchOrder} Vòng {selectedMatch.roundNumber}
              </ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Chọn sân thi đấu</label>
                <select
                  value={matchCourtId}
                  onChange={(e) => setMatchCourtId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chưa gán sân con --</option>
                  {courts.map(court => (
                    <option key={court.id} value={court.id}>{court.courtName}</option>
                  ))}
                </select>
              </div>

              <DateTimePicker
                label="Chọn giờ thi đấu dự kiến"
                value={matchScheduledAt}
                onChange={setMatchScheduledAt}
              />

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
                  Xác nhận xóa hình thức "{divisionPendingDelete.name}".
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
                  <option value="SINGLE_ELIMINATION">Loại đơn (Single Elimination)</option>
                  <option value="DOUBLE_ELIMINATION">Loại kép (Double Elimination)</option>
                  <option value="ROUND_ROBIN">Vòng tròn (Round Robin)</option>
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
