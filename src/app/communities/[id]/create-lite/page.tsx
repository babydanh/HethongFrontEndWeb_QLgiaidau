'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tournamentsApi } from '@/features/tournaments/api';
import { communitiesApi, Community } from '@/features/communities/api';
import { Calendar, ChevronLeft, Clock, Info, Loader2, Lock, RotateCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/error';

type LiteSport = 'badminton' | 'tennis' | 'pickleball' | 'table_tennis' | 'football';

const mapCategoryToLiteSport = (category?: { slug?: string; name?: string } | null): LiteSport => {
  const value = (category?.slug || category?.name || '').toLowerCase();
  if (value.includes('tennis') || value.includes('quần vợt') || value.includes('quan vot')) return 'tennis';
  if (value.includes('pickleball')) return 'pickleball';
  if (value.includes('table') || value.includes('bóng bàn') || value.includes('bong ban')) return 'table_tennis';
  if (value.includes('football') || value.includes('bóng đá') || value.includes('bong da') || value.includes('soccer')) return 'football';
  return 'badminton';
};

const sportLabel: Record<LiteSport, string> = {
  badminton: 'Cầu lông (Badminton)',
  tennis: 'Quần vợt (Tennis)',
  pickleball: 'Pickleball',
  table_tennis: 'Bóng bàn (Table Tennis)',
  football: 'Bóng đá (Football)',
};

export default function CreateLiteTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: communityId } = use(params);
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [sport, setSport] = useState<LiteSport>('badminton');
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'singles' | 'doubles'>('singles');
  const [bracketType, setBracketType] = useState<'single_elimination' | 'double_elimination' | 'round_robin'>('single_elimination');
  const [maxTeams, setMaxTeams] = useState(16);
  const [description, setDescription] = useState('');
  const [isRanked, setIsRanked] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('WEEKLY');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    communitiesApi.getCommunityById(communityId).then((response) => {
      const data = (response as { data?: Community }).data || (response as unknown as Community);
      setCommunity(data);
      if (data.categories?.[0]) setSport(mapCategoryToLiteSport(data.categories[0]));
    }).catch(() => toast.error('Không thể tải thông tin câu lạc bộ')).finally(() => setIsLoading(false));
  }, [communityId]);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error('Vui lòng nhập tên giải đấu');
    if (maxTeams < 2 || maxTeams > 128) return toast.error('Số đội tối đa phải từ 2 đến 128');
    try {
      setIsSubmitting(true);
      const result = await tournamentsApi.createLiteTournament({
        name: name.trim(), sport, communityId, format, bracketType, maxTeams,
        description: description.trim() || undefined,
        visibility: 'PRIVATE', registrationMode: 'OPEN', isRanked,
        startDate: startDate ? new Date(`${startDate}T${startTime || '18:00'}:00`).toISOString() : undefined,
        startTime: startTime || undefined,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        recurringDayOfWeek: isRecurring && startDate ? new Date(`${startDate}T12:00:00`).getDay() : undefined,
        recurringTimeOfDay: isRecurring ? (startTime || '18:00') : undefined,
      });
      toast.success('Tạo giải đấu thành công!');
      if (result?.id) router.push(`/organizer/tournaments/${result.id}/manage`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/communities/${communityId}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-6"><ChevronLeft className="w-4 h-4" /> Quay lại</Link>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Zap className="w-6 h-6 text-amber-500" /> Tạo giải đấu nhanh (Lite)</h1>
          <p className="text-slate-500 mt-1 text-sm">{community?.name ? `Câu lạc bộ: ${community.name}` : 'Tạo giải đấu nội bộ nhanh chóng'}</p>
          <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-950"><strong>Lưu ý:</strong> Đây là luồng tạo siêu nhanh cho CLB. Luật, lịch, sân, đăng ký và các cài đặt nâng cao sẽ được bổ sung trong trang quản lý sau khi tạo.</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
          <Input label="Tên giải đấu *" placeholder="VD: Giải Cầu lông Cuối Tuần" value={name} onChange={(event) => setName(event.target.value)} />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-700">Môn thể thao</label><span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"><Lock className="w-3 h-3" /> Theo bộ môn CLB</span></div>
            <div className="h-11 flex items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700">{sportLabel[sport]}</div>
            <p className="text-xs text-slate-500">Lite CLB tự dùng bộ môn của câu lạc bộ; không tạo giải khác môn trong luồng này.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Nội dung thi đấu</label><select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="singles">Đánh đơn (Singles)</option><option value="doubles">Đánh đôi (Doubles)</option></select></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Thể thức</label><select value={bracketType} onChange={(event) => setBracketType(event.target.value as typeof bracketType)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="single_elimination">Loại trực tiếp</option><option value="double_elimination">Loại kép</option><option value="round_robin">Vòng tròn</option></select></div>
          </div>
          <Input label="Số đội / người tối đa (2-128)" type="number" min={2} max={128} value={maxTeams} onChange={(event) => setMaxTeams(Number(event.target.value))} />
          <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700">Mô tả (không bắt buộc)</label><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Thông tin thêm về giải đấu..." rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm resize-none" /></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-500" /> Ngày bắt đầu (tùy chọn)</label><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-500" /> Giờ thi đấu</label><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div><span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><RotateCw className="w-4 h-4 text-slate-500" /> Tự động tạo giải định kỳ</span><p className="text-xs text-slate-500 mt-0.5">Cron sẽ tự tạo giải mới và mở đăng ký theo lịch này.</p></div>
              <button type="button" role="switch" aria-checked={isRecurring} onClick={() => setIsRecurring((value) => !value)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isRecurring ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} /></button>
            </div>
            {isRecurring && <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-3"><label className="text-xs font-semibold text-slate-700">Chu kỳ</label><select value={recurringFrequency} onChange={(event) => setRecurringFrequency(event.target.value as typeof recurringFrequency)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="WEEKLY">Hằng tuần</option><option value="BIWEEKLY">Hai tuần một lần</option><option value="MONTHLY">Hằng tháng</option></select><p className="text-xs text-slate-500">Ngày chạy lấy theo ngày bắt đầu; nếu bỏ trống, hệ thống dùng lịch mặc định.</p></div>}
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50/50"><div><span className="text-sm font-semibold text-slate-800">{isRanked ? 'Xếp hạng ELO CLB' : 'Phong trào'}</span><p className="text-xs text-slate-500 mt-0.5">{isRanked ? 'Kết quả ảnh hưởng đến điểm ELO nội bộ CLB.' : 'Giải giao hữu, không tính ELO quốc gia.'}</p></div><button type="button" role="switch" aria-checked={isRanked} onClick={() => setIsRanked((value) => !value)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRanked ? 'bg-amber-500' : 'bg-slate-300'}`}><span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isRanked ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100"><Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" /><span>Sau khi tạo, giải ở trạng thái mở đăng ký nội bộ và bạn có thể vào <strong>Quản lý giải</strong> để bổ sung mọi thông tin nâng cao. Không có preset điểm bắt buộc trong Lite.</span></div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100"><Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Hủy</Button><Button onClick={handleSubmit} isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">{isSubmitting ? 'Đang tạo...' : 'Tạo giải đấu'}</Button></div>
        </div>
      </div>
    </div>
  );
}
