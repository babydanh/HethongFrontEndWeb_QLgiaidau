'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { ChevronLeft, Loader2, Zap, Info, Lock, Calendar, Clock, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';
import { LiteInviteQr } from '@/components/tournaments/LiteInviteQr';
import { buildLiteJoinUrl } from '@/features/tournaments/lite-qr';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { categoriesApi, Category } from '@/features/categories/api';

type CreatedLiteTournament = {
  id: string;
  name: string;
  inviteCode: string;
};

type LiteSport = '' | 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';

const mapCategoryToLiteSport = (cat?: { slug?: string; name?: string } | null): LiteSport => {
  if (!cat) return '';
  const slug = (cat.slug || cat.name || '').toLowerCase();
  if (slug.includes('badminton') || slug.includes('cầu lông') || slug.includes('cau long')) return 'badminton';
  if (slug.includes('tennis') || slug.includes('quần vợt') || slug.includes('quan vot')) return 'tennis';
  if (slug.includes('pickleball')) return 'pickleball';
  if (slug.includes('table_tennis') || slug.includes('table-tennis') || slug.includes('bóng bàn') || slug.includes('bong ban') || slug.includes('tabletennis')) return 'table_tennis';
  if (slug.includes('football') || slug.includes('bóng đá') || slug.includes('bong da') || slug.includes('soccer')) return 'football';
  if (['badminton', 'tennis', 'pickleball', 'table_tennis', 'football'].includes(slug)) {
    return slug as Exclude<LiteSport, ''>;
  }
  return 'badminton';
};


  const DAYS_OF_WEEK = [
    { value: 1, label: 'Thứ 2', short: 'T2' },
    { value: 2, label: 'Thứ 3', short: 'T3' },
    { value: 3, label: 'Thứ 4', short: 'T4' },
    { value: 4, label: 'Thứ 5', short: 'T5' },
    { value: 5, label: 'Thứ 6', short: 'T6' },
    { value: 6, label: 'Thứ 7', short: 'T7' },
    { value: 0, label: 'Chủ Nhật', short: 'CN' },
  ];


export default function CreateLiteTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const communityId = resolvedParams.id;
  const router = useRouter();

  const [community, setCommunity] = useState<Community | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTournament, setCreatedTournament] = useState<CreatedLiteTournament | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [sport, setSport] = useState<LiteSport>('');
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [genderRestriction, setGenderRestriction] = useState<'MALE' | 'FEMALE' | ''>('');
  const [teamSize, setTeamSize] = useState<5 | 7 | 11>(7);
  const [maxReserve, setMaxReserve] = useState(5);
  const [setsToWin, setSetsToWin] = useState(2);
  const [pointsPerSet, setPointsPerSet] = useState(21);
  const [winByTwo, setWinByTwo] = useState(true);
  const [maxPoints, setMaxPoints] = useState(30);
  const [footballHalvesCount, setFootballHalvesCount] = useState(2);
  const [footballHalfDuration, setFootballHalfDuration] = useState(45);
  const [footballAllowDraw, setFootballAllowDraw] = useState(true);
  const [bracketType, setBracketType] = useState<'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout'>('single_elimination');
  const [maxTeams, setMaxTeams] = useState(16);
  const [description, setDescription] = useState('');
  const [isRanked, setIsRanked] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [registrationStartDate, setRegistrationStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [registrationStartTime, setRegistrationStartTime] = useState('09:00');
  const [registrationEndDate, setRegistrationEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [registrationEndTime, setRegistrationEndTime] = useState('17:00');
  const [venueName, setVenueName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurringDaysOfWeek, setRecurringDaysOfWeek] = useState<number[]>([6]);
  const [recurringTimeOfDay, setRecurringTimeOfDay] = useState('18:00');
  const [recurringAdvanceDays, setRecurringAdvanceDays] = useState<number>(0);

  const toggleRecurringDay = (day: number) => {
    setRecurringDaysOfWeek((prev: number[]) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d: number) => d !== day);
      } else {
        return [...prev, day].sort((a: number, b: number) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
      }
    });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await communitiesApi.getCommunityById(communityId);
        const data = (res as { data?: Community })?.data || (res as unknown as Community);
        setCommunity(data);
        if (data.categories?.[0]) {
          const clubSport = mapCategoryToLiteSport(data.categories[0]);
          if (clubSport) setSport(clubSport);
        }
      } catch {
        toast.error('Không thể tải thông tin câu lạc bộ');
      } finally {
        setIsLoadingCommunity(false);
      }
    };
    init();
  }, [communityId]);

  useEffect(() => {
    categoriesApi.getCategories().then((response) => {
      setCategories(response.data.filter((category) => category.isActive !== false));
    }).catch(() => {
      setCategories([]);
    });
  }, []);

  useEffect(() => {
    if (sport === 'football') {
      setFootballHalvesCount(2);
      setFootballHalfDuration(45);
      setFootballAllowDraw(true);
      return;
    }
    const defaults = sport === 'table_tennis'
      ? { sets: 3, points: 11, max: 99 }
      : sport === 'pickleball'
        ? { sets: 2, points: 11, max: 15 }
        : sport === 'tennis'
          ? { sets: 1, points: 6, max: 7 }
          : { sets: 2, points: 21, max: 30 };
    setSetsToWin(defaults.sets);
    setPointsPerSet(defaults.points);
    setMaxPoints(defaults.max);
    setWinByTwo(true);
  }, [sport]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên giải đấu');
      return;
    }
    if (!sport) {
      toast.error('Vui lòng chọn môn thể thao');
      return;
    }
    if (maxTeams < 2 || maxTeams > 32) {
      toast.error('Số đội tối đa phải từ 2 đến 32');
      return;
    }
    const registrationStart = new Date(`${registrationStartDate}T${registrationStartTime}:00`);
    const registrationEnd = new Date(`${registrationEndDate}T${registrationEndTime}:00`);
    const tournamentStart = new Date(`${startDate}T${startTime}:00`);
    if (registrationStart >= registrationEnd || registrationEnd >= tournamentStart) {
      toast.error('Lịch đăng ký phải theo thứ tự: mở < đóng < bắt đầu giải.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await tournamentsApi.createLiteTournament({
        name: name.trim(),
        sport,
        communityId,
        format: sport === 'football' ? 'doubles' : format,
        ...(sport === 'football'
          ? {
              genderRestriction: genderRestriction || undefined,
              teamSize,
              maxReserve,
              footballHalvesCount,
              footballHalfDuration,
              footballAllowDraw,
            }
          : { setsToWin, pointsPerSet, winByTwo, maxPoints }),
        bracketType,
        maxTeams,
        description: description.trim() || `Giải đấu nhanh CLB ${community?.name || ''}`,
        registrationMode: 'OPEN',
        venueName: venueName.trim() || undefined,
        locationAddress: locationAddress.trim() || undefined,
        province: province.trim() || undefined,
        district: district.trim() || undefined,
        ward: ward.trim() || undefined,
        isRanked,
        startDate: startDate || undefined,
        startTime: startTime || undefined,
        isRecurring,
        registrationStartDate: registrationStart.toISOString(),
        registrationEndDate: registrationEnd.toISOString(),
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        recurringDayOfWeek: isRecurring ? (recurringDaysOfWeek[0] ?? 6) : undefined,
        recurringDaysOfWeek: isRecurring ? recurringDaysOfWeek : undefined,
        recurringTimeOfDay: isRecurring ? recurringTimeOfDay : undefined,
        recurringAdvanceDays: isRecurring ? recurringAdvanceDays : undefined,
      });

      if (res?.id && res.inviteCode) {
        setCreatedTournament({
          id: res.id,
          name: res.name || name.trim(),
          inviteCode: res.inviteCode,
        });
        toast.success('Tạo giải đấu thành công! Mã QR đã sẵn sàng.');
      } else {
        toast.error('Đã tạo giải nhưng chưa nhận được mã mời. Vui lòng mở trang quản lý.');
        if (res?.id) router.push(`/lite/tournaments/${res.id}/manage`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCommunity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner className="w-12 h-12" />
      </div>
    );
  }

  if (createdTournament && typeof window !== 'undefined') {
    const inviteUrl = buildLiteJoinUrl(createdTournament.inviteCode, window.location.origin);
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-2xl space-y-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Tạo giải thành công</h1>
            <p className="mt-1 text-sm text-slate-500">
              Đưa mã QR cho người chơi quét bằng camera điện thoại để mở trang tham gia.
            </p>
          </div>
          <LiteInviteQr inviteUrl={inviteUrl} tournamentName={createdTournament.name} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => router.push(`/communities/${communityId}/manage/tournaments`)}>
              Danh sách giải
            </Button>
            <Button onClick={() => router.push(`/lite/tournaments/${createdTournament.id}/manage`)}>
              Vào quản lý giải
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href={`/communities/${communityId}`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Tạo giải đấu nhanh (Lite)
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {community?.name ? `Câu lạc bộ: ${community.name}` : 'Tạo giải đấu nội bộ nhanh chóng'}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
          {/* Name */}
          <Input
            label="Tên giải đấu *"
            placeholder="VD: Giải Cầu lông Cuối Tuần"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Sport */}
          {(() => {
            const clubCategory = community?.categories?.[0];
            const isClubLocked = Boolean(clubCategory);
            return (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Môn thể thao *</label>
                  {isClubLocked && clubCategory && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Lock className="w-3 h-3" /> Cố định theo CLB: {clubCategory.name}
                    </span>
                  )}
                </div>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as LiteSport)}
                  disabled={isClubLocked}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                >
                  <option value="">Chọn môn thể thao</option>
                  {categories.map((category) => (
                    <option key={category.id} value={mapCategoryToLiteSport(category)}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {isClubLocked && clubCategory && (
                  <p className="text-xs text-slate-500 font-medium">
                    🔒 Giải đấu nhanh của CLB được tự động khóa theo bộ môn của câu lạc bộ ({clubCategory.name}).
                  </p>
                )}
              </div>
            );
          })()}

          {sport === 'football' && (
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Đội hình</label>
                <select value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value) as 5 | 7 | 11)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                  <option value={5}>Sân 5</option>
                  <option value={7}>Sân 7</option>
                  <option value={11}>Sân 11</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Giới tính</label>
                <select value={genderRestriction} onChange={(e) => setGenderRestriction(e.target.value as 'MALE' | 'FEMALE' | '')} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                  <option value="">Không ràng buộc</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                </select>
              </div>
              <Input label="Dự bị tối đa" type="number" min={0} max={20} value={maxReserve} onChange={(e) => setMaxReserve(Math.max(0, Math.min(20, Number(e.target.value) || 0)))} />
              <Input label="Số hiệp" type="number" min={1} max={4} value={footballHalvesCount} onChange={(e) => setFootballHalvesCount(Math.max(1, Math.min(4, Number(e.target.value) || 1)))} />
              <Input label="Phút mỗi hiệp" type="number" min={1} max={120} value={footballHalfDuration} onChange={(e) => setFootballHalfDuration(Math.max(1, Math.min(120, Number(e.target.value) || 45)))} />
              <label className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={footballAllowDraw} onChange={(e) => setFootballAllowDraw(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                Cho phép hòa
              </label>
            </div>
          )}

          {sport && sport !== 'football' && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Luật mặc định</h2>
                <p className="text-xs text-slate-500 mt-1">Đã điền theo môn. Đây chỉ là giá trị bắt đầu; giải Lite vẫn cho phép nhập điểm tự do khi thi đấu.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Input label="Set thắng" type="number" min={1} max={5} value={setsToWin} onChange={(e) => setSetsToWin(Math.max(1, Math.min(5, Number(e.target.value) || 1)))} />
                <Input label="Điểm/set" type="number" min={1} max={99} value={pointsPerSet} onChange={(e) => setPointsPerSet(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} />
                <Input label="Điểm tối đa" type="number" min={1} max={199} value={maxPoints} onChange={(e) => setMaxPoints(Math.max(1, Math.min(199, Number(e.target.value) || 1)))} />
                <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={winByTwo} onChange={(e) => setWinByTwo(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                  Chạm 2
                </label>
              </div>
            </div>
          )}

          {/* Format & Bracket in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Hình thức</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                disabled={sport === 'football'}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="singles">Đánh đơn (Singles)</option>
                <option value="doubles">Đánh đôi (Doubles)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Thể thức</label>
              <select
                value={bracketType}
                onChange={(e) => setBracketType(e.target.value as typeof bracketType)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="single_elimination">Loại trực tiếp</option>
                <option value="double_elimination">Loại kép (Nhánh thắng/thua)</option>
                <option value="round_robin">Vòng tròn tính điểm</option>
                <option value="group_stage_knockout">Vòng bảng + loại trực tiếp</option>
              </select>
              {bracketType === 'group_stage_knockout' && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Cần tối thiểu 4 đội để chia bảng. Hệ thống tự động chia đều.
                </p>
              )}
            </div>
          </div>

          {/* Max Teams */}
          <Input
            label="Số đội tối đa (2-32)"
            type="number"
            min={2}
            max={32}
            value={maxTeams}
            onChange={(e) => setMaxTeams(Number(e.target.value))}
          />

          {/* Thời gian thi đấu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" /> Ngày bắt đầu
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Giờ thi đấu
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Lịch đăng ký</h2>
              <p className="text-xs text-slate-500">Mặc định mở từ hôm nay. Bạn có thể nhập ngày và giờ cụ thể.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Input label="Mở đăng ký" type="date" value={registrationStartDate} onChange={(e) => setRegistrationStartDate(e.target.value)} />
                <Input label="Giờ mở" type="time" value={registrationStartTime} onChange={(e) => setRegistrationStartTime(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Đóng đăng ký" type="date" value={registrationEndDate} onChange={(e) => setRegistrationEndDate(e.target.value)} />
                <Input label="Giờ đóng" type="time" value={registrationEndTime} onChange={(e) => setRegistrationEndTime(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Địa điểm thi đấu</h2>
              <p className="text-xs text-slate-500">Tên sân sẽ hiện trên thẻ trận; địa chỉ chi tiết hiện ở trang giải.</p>
            </div>
            <Input label="Tên sân" placeholder="Ví dụ: Sân Pickleball Trung tâm" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
            <Input label="Địa chỉ chi tiết" placeholder="Số nhà, đường..." value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Tỉnh/Thành" value={province} onChange={(e) => setProvince(e.target.value)} />
              <Input label="Quận/Huyện" value={district} onChange={(e) => setDistrict(e.target.value)} />
              <Input label="Phường/Xã" value={ward} onChange={(e) => setWard(e.target.value)} />
            </div>
          </div>

          {/* Lên lịch định kỳ tự động */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <RotateCw className={`w-4 h-4 ${isRecurring ? 'text-emerald-600' : 'text-slate-500'}`} />
                  Tự động tạo giải theo chu kỳ định kỳ
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  Hệ thống tự động tạo giải mới và mở đăng ký cho thành viên CLB theo lịch lặp lại
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isRecurring}
                onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  isRecurring ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    isRecurring ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isRecurring && (
              <div className="pt-3 border-t border-slate-200/80 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tần suất lặp lại</label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value as typeof recurringFrequency)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                    >
                      <option value="WEEKLY">Hằng tuần (Weekly)</option>
                      <option value="BIWEEKLY">2 tuần một lần (Bi-weekly)</option>
                      <option value="DAILY">Hằng ngày (Daily)</option>
                      <option value="MONTHLY">Hằng tháng (Monthly)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> Giờ thi đấu định kỳ
                    </label>
                    <input
                      type="time"
                      value={recurringTimeOfDay}
                      onChange={(e) => setRecurringTimeOfDay(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                    />
                  </div>
                </div>

                {recurringFrequency !== 'DAILY' && recurringFrequency !== 'MONTHLY' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        Chọn các ngày thi đấu trong tuần ({recurringDaysOfWeek.length} ngày đã chọn)
                      </label>
                      <span className="text-[11px] text-slate-500 font-normal">Có thể chọn nhiều ngày</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map(({ value, label, short }) => {
                        const isSelected = recurringDaysOfWeek.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleRecurringDay(value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                                {/* Mở đăng ký trước bao nhiêu ngày */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Thời điểm hệ thống tự tạo giải & mở đăng ký
                  </label>
                  <select
                    value={recurringAdvanceDays}
                    onChange={(e) => setRecurringAdvanceDays(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                  >
                    <option value={0}>Tạo & mở đăng ký đúng ngày thi đấu (Cùng ngày)</option>
                    <option value={1}>Tạo trước 1 ngày (Mở đăng ký trước 24h)</option>
                    <option value={2}>Tạo trước 2 ngày (Mở đăng ký trước 48h)</option>
                    <option value={3}>Tạo trước 3 ngày (Mở đăng ký trước 3 ngày)</option>
                    <option value={5}>Tạo trước 5 ngày</option>
                    <option value={7}>Tạo trước 1 tuần (Mở đăng ký trước 7 ngày)</option>
                  </select>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                  🔄 <strong>Lịch trình tự động:</strong> Giải đấu sẽ thi đấu vào{' '}
                  <strong className="text-emerald-950 font-bold">{recurringTimeOfDay}</strong>{' '}
                  {recurringFrequency === 'DAILY'
                    ? 'hằng ngày'
                    : recurringFrequency === 'MONTHLY'
                    ? 'hằng tháng'
                    : `các ngày ${recurringDaysOfWeek
                        .map((d) => DAYS_OF_WEEK.find((item) => item.value === d)?.label)
                        .filter(Boolean)
                        .join(', ')} hằng ${recurringFrequency === 'BIWEEKLY' ? '2 tuần' : 'tuần'}`}.
                  <br />
                  <span className="text-emerald-700 text-[11px] mt-1 inline-block">
                    📢 Toàn bộ thành viên CLB sẽ nhận được thông báo & bài đăng bảng tin để tham gia.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Mô tả (không bắt buộc)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thông tin thêm về giải đấu..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* isRanked toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-start gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">
                  {isRanked ? 'Xếp hạng ELO' : 'Phong trào'}
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  {isRanked
                    ? 'Kết quả ảnh hưởng đến điểm ELO trong câu lạc bộ'
                    : 'Giải đấu giao hữu, không tính điểm xếp hạng'}
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isRanked}
              onClick={() => setIsRanked(!isRanked)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                isRanked ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  isRanked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <span>
              Giải đấu nội bộ CLB hoàn toàn miễn phí. Sau khi tạo, giải sẽ được đặt ở trạng thái mở đăng ký và bạn có thể quản lý ngay.
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo giải đấu'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
