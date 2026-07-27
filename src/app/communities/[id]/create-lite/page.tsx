'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { ChevronLeft, Loader2, Zap, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

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

  // Form fields
  const [name, setName] = useState('');
  const [sport, setSport] = useState<'badminton' | 'tennis' | 'pickleball' | 'table_tennis'>('badminton');
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [bracketType, setBracketType] = useState<'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage_knockout'>('single_elimination');
  const [maxTeams, setMaxTeams] = useState(16);
  const [description, setDescription] = useState('');
  const [isRanked, setIsRanked] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await communitiesApi.getCommunityById(communityId);
        const data = (res as { data?: Community })?.data || (res as unknown as Community);
        setCommunity(data);
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
      });

      toast.success('Tạo giải đấu thành công!');
      const newId = res?.id;
      if (newId) {
        router.push(`/lite/tournaments/${newId}/manage`);
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Môn thể thao</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value as typeof sport)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="badminton">Cầu lông (Badminton)</option>
              <option value="tennis">Quần vợt (Tennis)</option>
              <option value="pickleball">Pickleball</option>
              <option value="table_tennis">Bóng bàn (Table Tennis)</option>
            </select>
          </div>

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
                    ? 'Kết quả ảnh hưởng đến điểm ELO của người chơi'
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
