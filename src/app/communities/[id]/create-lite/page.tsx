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

type CreatedLiteTournament = {
  id: string;
  name: string;
  inviteCode: string;
};

const mapCategoryToLiteSport = (cat?: { slug?: string; name?: string } | null): '' | 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' => {
  if (!cat) return '';
  const slug = (cat.slug || cat.name || '').toLowerCase();
  if (slug.includes('badminton') || slug.includes('cầu lông') || slug.includes('cau long')) return 'badminton';
  if (slug.includes('tennis') || slug.includes('quần vợt') || slug.includes('quan vot')) return 'tennis';
  if (slug.includes('pickleball')) return 'pickleball';
  if (slug.includes('table_tennis') || slug.includes('table-tennis') || slug.includes('bóng bàn') || slug.includes('bong ban') || slug.includes('tabletennis')) return 'table_tennis';
  if (['badminton', 'tennis', 'pickleball', 'table_tennis'].includes(slug)) {
    return slug as 'badminton' | 'tennis' | 'pickleball' | 'table_tennis';
  }
  return 'badminton';
};

export default function CreateLiteTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const communityId = resolvedParams.id;
  const router = useRouter();

  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTournament, setCreatedTournament] = useState<CreatedLiteTournament | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [sport, setSport] = useState<'' | 'badminton' | 'tennis' | 'pickleball' | 'table_tennis'>('');
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [bracketType, setBracketType] = useState<'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout'>('single_elimination');
  const [maxTeams, setMaxTeams] = useState(16);
  const [description, setDescription] = useState('');
  const [isRanked, setIsRanked] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState<number>(6);

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

    try {
      setIsSubmitting(true);
      const res = await tournamentsApi.createLiteTournament({
        name: name.trim(),
        sport,
        communityId,
        format,
        bracketType,
        maxTeams,
        description: description.trim() || `Giải đấu nhanh CLB ${community?.name || ''}`,
        isRanked,
        startDate: startDate || undefined,
        startTime: startTime || undefined,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        recurringDayOfWeek: isRecurring ? recurringDayOfWeek : undefined,
        recurringTimeOfDay: isRecurring ? startTime : undefined,
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
                  onChange={(e) => setSport(e.target.value as typeof sport)}
                  disabled={isClubLocked}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                >
                  <option value="">Chọn môn thể thao</option>
                  <option value="badminton">Cầu lông (Badminton)</option>
                  <option value="tennis">Quần vợt (Tennis)</option>
                  <option value="pickleball">Pickleball</option>
                  <option value="table_tennis">Bóng bàn (Table Tennis)</option>
                </select>
                {isClubLocked && clubCategory && (
                  <p className="text-xs text-slate-500 font-medium">
                    🔒 Giải đấu nhanh của CLB được tự động khóa theo bộ môn của câu lạc bộ ({clubCategory.name}).
                  </p>
                )}
              </div>
            );
          })()}

          {/* Format & Bracket in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Hình thức</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
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
              <div className="pt-3 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tần suất lặp lại</label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value as typeof recurringFrequency)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="WEEKLY">Hằng tuần (Weekly)</option>
                      <option value="BIWEEKLY">2 tuần một lần (Bi-weekly)</option>
                      <option value="DAILY">Hằng ngày (Daily)</option>
                      <option value="MONTHLY">Hằng tháng (Monthly)</option>
                    </select>
                  </div>

                  {recurringFrequency !== 'DAILY' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">Thứ trong tuần</label>
                      <select
                        value={recurringDayOfWeek}
                        onChange={(e) => setRecurringDayOfWeek(Number(e.target.value))}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value={1}>Thứ Hai</option>
                        <option value={2}>Thứ Ba</option>
                        <option value={3}>Thứ Tư</option>
                        <option value={4}>Thứ Năm</option>
                        <option value={5}>Thứ Sáu</option>
                        <option value={6}>Thứ Bảy</option>
                        <option value={0}>Chủ Nhật</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                  💡 <strong>Thông báo tự động:</strong> Mỗi khi giải đấu mới được tạo theo chu kỳ, toàn bộ thành viên câu lạc bộ sẽ nhận được thông báo để đăng ký tham gia thi đấu.
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
