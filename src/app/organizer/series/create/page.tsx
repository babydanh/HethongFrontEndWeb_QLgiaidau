'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { seriesApi } from '@/features/series/api';
import { PsrPointConfig, ExclusionScope } from '@/types/series';
import { ArrowLeft, Trophy, Save, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CreateSeriesPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalPrize, setTotalPrize] = useState('');

  // Rules states
  const [directEntryThreshold, setDirectEntryThreshold] = useState(2);
  const [wildcardCount, setWildcardCount] = useState(16);
  const [exclusionRule, setExclusionRule] = useState(true);
  const [exclusionScope, setExclusionScope] = useState<ExclusionScope>('CATEGORY');
  const [rulesDescription, setRulesDescription] = useState('Tính điểm PSR tích lũy. Top 2 nhận vé thẳng, Top 16 PSR nhận vé vớt chặng.');
  
  // Ranks points configuration
  const [pointsByRank, setPointsByRank] = useState<Array<{ rank: number; points: number }>>([
    { rank: 1, points: 100 },
    { rank: 2, points: 80 },
    { rank: 3, points: 60 },
    { rank: 5, points: 40 },
    { rank: 9, points: 20 },
    { rank: 17, points: 10 },
  ]);

  const handleAddRank = () => {
    setPointsByRank(prev => [...prev, { rank: prev.length > 0 ? Math.max(...prev.map(p => p.rank)) + 1 : 1, points: 0 }]);
  };

  const handleRemoveRank = (index: number) => {
    setPointsByRank(prev => prev.filter((_, i) => i !== index));
  };

  const handleRankChange = (index: number, field: 'rank' | 'points', val: number) => {
    setPointsByRank(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Vui lòng nhập tên chuỗi giải đấu');
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert ranks array back to Record<number, number>
      const pointsByRankRecord: Record<number, number> = {};
      pointsByRank.forEach(item => {
        pointsByRankRecord[item.rank] = item.points;
      });

      const rulesConfig: PsrPointConfig = {
        pointsByRank: pointsByRankRecord,
        directEntryThreshold,
        wildcardCount,
        exclusionRule,
        exclusionScope,
        description: rulesDescription,
      };

      const payload = {
        name,
        description: description || undefined,
        bannerUrl: bannerUrl || undefined,
        logoUrl: logoUrl || undefined,
        visibility,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        totalPrize: totalPrize ? Number(totalPrize) : undefined,
        rules: rulesConfig,
      };

      const res = await seriesApi.createSeries(payload);
      toast.success('Tạo chuỗi giải đấu thành công!');
      router.push(`/organizer/series/${res.id}/manage`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi tạo chuỗi giải đấu';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/organizer/series"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách chuỗi giải
        </Link>

        {/* Header Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">Thiết Lập Chuỗi Giải Đấu Mới</h1>
            <p className="text-xs text-slate-500 mt-0.5">Khởi tạo hệ thống giải đấu vòng loại tích lũy và điều lệ suất vé đặc cách</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Section 1: General Info */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Thông Tin Chung</h2>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Tên chuỗi giải đấu *</label>
              <Input
                placeholder="Ví dụ: Pickleball Tour Hà Nội 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Mô tả chuỗi giải</label>
              <textarea
                rows={3}
                placeholder="Mô tả tóm tắt về chuỗi đấu, quy mô và nhà tài trợ..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Ngày kết thúc</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Tổng giải thưởng (VNĐ)</label>
                <Input
                  type="number"
                  placeholder="Ví dụ: 100000000"
                  value={totalPrize}
                  onChange={(e) => setTotalPrize(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Link ảnh Banner bìa</label>
                <Input
                  placeholder="Link url ảnh bìa (banner)"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Link ảnh Logo nhỏ</label>
                <Input
                  placeholder="Link url logo chuỗi giải"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 w-64">
              <label className="text-xs font-bold text-slate-700">Chế độ hiển thị</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-white focus:border-blue-600 outline-none transition-all cursor-pointer h-[42px]"
              >
                <option value="PUBLIC">Công khai (Public)</option>
                <option value="PRIVATE">Riêng tư (Private)</option>
              </select>
            </div>
          </div>

          {/* Section 2: PSR Calculation Rules */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Quy Tắc Tích Lũy Điểm PSR</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Ngưỡng vé thẳng (Hạng đạt được)</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={directEntryThreshold}
                    onChange={(e) => setDirectEntryThreshold(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-xs text-slate-400 font-medium">Lọt vào top này sẽ được đặc cách Vé Thẳng đi tiếp chặng.</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Số suất vé vớt tích lũy PSR</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    value={wildcardCount}
                    onChange={(e) => setWildcardCount(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-xs text-slate-400 font-medium">Số lượng VĐV tích lũy điểm cao nhất chặng nhận vé vớt.</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Luật khóa đăng ký (Exclusion Rule)</label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    id="exRule"
                    checked={exclusionRule}
                    onChange={(e) => setExclusionRule(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="exRule" className="text-xs text-slate-600 font-bold cursor-pointer">
                    Khóa VĐV đã đoạt vé thẳng không cho đấu tiếp chặng này.
                  </label>
                </div>
              </div>

              {exclusionRule && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">Phạm vi khóa (Exclusion Scope)</label>
                  <select
                    value={exclusionScope}
                    onChange={(e) => setExclusionScope(e.target.value as ExclusionScope)}
                    className="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:bg-white focus:border-blue-600 outline-none transition-all cursor-pointer h-[42px]"
                  >
                    <option value="CATEGORY">Chỉ khóa trong nội dung đó (CATEGORY)</option>
                    <option value="ALL">Khóa toàn bộ chặng đấu (ALL)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
              <label className="text-xs font-bold text-slate-700">Mô tả tóm tắt điều lệ chặng</label>
              <textarea
                rows={2}
                placeholder="Điều lệ chặng..."
                value={rulesDescription}
                onChange={(e) => setRulesDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
            </div>

            {/* Table Points config */}
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Cấu hình phân phối điểm theo thứ hạng</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Xác định số điểm PSR tương ứng khi VĐV đạt thứ hạng</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddRank}
                  className="text-xs border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 py-1 px-3"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm thứ hạng
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pointsByRank.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-400">Hạng:</span>
                      <input
                        type="number"
                        min={1}
                        value={item.rank}
                        onChange={(e) => handleRankChange(index, 'rank', Number(e.target.value))}
                        className="w-14 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold"
                      />
                      <span className="font-bold text-slate-400">→</span>
                      <input
                        type="number"
                        min={0}
                        value={item.points}
                        onChange={(e) => handleRankChange(index, 'points', Number(e.target.value))}
                        className="w-16 bg-white border border-slate-200 rounded-lg p-1 text-center font-black text-blue-600"
                      />
                      <span className="font-semibold text-slate-400">pts</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRank(index)}
                      className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Link href="/organizer/series">
              <Button type="button" variant="outline" className="px-6 border-slate-200 hover:bg-slate-100 text-slate-700">
                Hủy bỏ
              </Button>
            </Link>
            <Button 
              type="submit" 
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              isLoading={isSubmitting}
            >
              <Save className="w-4 h-4" /> Tạo chuỗi giải đấu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
