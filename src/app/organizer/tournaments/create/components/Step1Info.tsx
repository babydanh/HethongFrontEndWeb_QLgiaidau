'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { categoriesApi, Category } from '@/features/categories/api';
import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { ChevronRight, Trophy, LayoutGrid, RotateCw, Shield } from 'lucide-react';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';
import { inferSportRuleKindFromCategory } from '@/features/tournaments/sport-rules/normalize';
import { normalizeMatchFormatForCategory } from '@/features/tournaments/match-format-options';



const step1Schema = z.object({
  name: z.string().min(5, 'Tên Giải đấu phải có ít nhất 5 ký tự').max(150, 'Tên Giải đấu quá dài'),
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự').max(1000, 'Mô tả tối đa 1000 ký tự'),
  categoryId: z.string().min(1, 'Vui lòng chọn bộ môn thi đấu'),
  tournamentType: z.enum(['CLUB', 'PUBLIC']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  isRanked: z.boolean(),
  registrationMode: z.enum(['OPEN', 'APPROVAL', 'INVITE_ONLY']),
  maxParticipants: z.string().refine((val) => {
    if (val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 2;
  }, 'Số đội tối đa phải là số lớn hơn hoặc bằng 2'),
  minElo: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'Điểm ELO tối thiểu phải là số lớn hơn hoặc bằng 0'),
  maxElo: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'Điểm ELO tối đa phải là số lớn hơn hoặc bằng 0'),
  maxCombinedElo: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'Tổng ELO tối đa phải là số lớn hơn hoặc bằng 0'),
  maxTeammateGap: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'Chênh lệch ELO tối đa phải là số lớn hơn hoặc bằng 0'),
}).superRefine((data, ctx) => {
  if (data.minElo && data.maxElo) {
    if (Number(data.minElo) > Number(data.maxElo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Điểm ELO tối thiểu không được lớn hơn ELO tối đa',
        path: ['minElo'],
      });
    }
  }
});

type Step1Values = z.infer<typeof step1Schema>;

export default function Step1Info() {
  const { formData, updateFormData, nextStep, validationTarget, clearValidationTarget } = useCreateTournamentStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, setValue, setError, setFocus, control, formState: { errors } } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId,
      tournamentType: formData.communityId ? (formData.tournamentType || 'CLUB') : 'PUBLIC',
      visibility: formData.visibility || 'PUBLIC',
      isRanked: formData.isRanked ?? true,
      registrationMode: formData.registrationMode || 'OPEN',
      maxParticipants: formData.maxParticipants ? String(formData.maxParticipants) : '16',
      minElo: formData.minElo !== null && formData.minElo !== undefined ? String(formData.minElo) : '',
      maxElo: formData.maxElo !== null && formData.maxElo !== undefined ? String(formData.maxElo) : '',
      maxCombinedElo: formData.maxCombinedElo !== null && formData.maxCombinedElo !== undefined ? String(formData.maxCombinedElo) : '',
      maxTeammateGap: formData.maxTeammateGap !== null && formData.maxTeammateGap !== undefined ? String(formData.maxTeammateGap) : '',
    },
  });

  useEffect(() => {
    if (validationTarget?.step !== 1) return;
    const field = validationTarget.field as keyof Step1Values;
    setError(field, { type: 'publish', message: validationTarget.message });
    setFocus(field);
    clearValidationTarget();
  }, [clearValidationTarget, setError, setFocus, validationTarget]);

  const watchIsRanked = useWatch({ control, name: 'isRanked' });
  const watchTournamentType = useWatch({ control, name: 'tournamentType' }) || (formData.communityId ? 'CLUB' : 'PUBLIC');
  const watchVisibility = useWatch({ control, name: 'visibility' }) || 'PUBLIC';
  const watchRegistrationMode = useWatch({ control, name: 'registrationMode' }) || 'OPEN';
  const [selectedFormat, setSelectedFormat] = useState<'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT'>(
    formData.format || 'SINGLE_ELIMINATION'
  );
  const [enableEloLimit, setEnableEloLimit] = useState<boolean>(() => {
    return (
      (formData.minElo !== null && formData.minElo !== undefined) ||
      (formData.maxElo !== null && formData.maxElo !== undefined) ||
      (formData.maxCombinedElo !== null && formData.maxCombinedElo !== undefined) ||
      (formData.maxTeammateGap !== null && formData.maxTeammateGap !== undefined)
    );
  });
  const [fees, setFees] = useState({
    feePublicRanked: 100000,
    feePublicUnranked: 50000,
    feeClub: 0,
    pctPublicRanked: 5,
    pctPublicUnranked: 5,
    pctClub: 0,
  });

  useEffect(() => {
    const fetchCategoriesAndFees = async () => {
      try {
        const catRes = await categoriesApi.getCategories();
        if (catRes.data) {
          const activeCats = catRes.data.filter((c) => {
            const catKey = c.slug || c.id;
            if (typeof window !== 'undefined') {
              const localOverride = localStorage.getItem(`sport_active_${catKey}`);
              if (localOverride === 'false') return false;
              if (localOverride === 'true') return true;
            }
            return c.isActive !== false && (c.categoryConfig as Record<string, unknown> | null | undefined)?.isActive !== false;
          });
          setCategories(activeCats);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoading(false);
      }

      try {
        const feesRes = await api.get<ApiResponse<{
          feePublicRanked: number;
          feePublicUnranked: number;
          feeClub: number;
          pctPublicRanked: number;
          pctPublicUnranked: number;
          pctClub: number;
        }>>('/tournaments/fees');
        if (feesRes.data) setFees(feesRes.data);
      } catch (error) {
        console.error('Failed to fetch fees config:', error);
      }
    };
    fetchCategoriesAndFees();
  }, []);

  const onSubmit = (data: Step1Values) => {
    const selectedCategory = categories.find((category) => category.id === data.categoryId);
    const inferredKind = inferSportRuleKindFromCategory(selectedCategory);

    updateFormData({
      name: trimAndNormalizeSpaces(data.name),
      description: data.description ? trimAndNormalizeSpaces(data.description) : '',
      categoryId: data.categoryId,
      format: selectedFormat,
      sportRules: buildDefaultSportRules(inferredKind),
      matchFormat: normalizeMatchFormatForCategory(formData.matchFormat, selectedCategory),
      selectedFormats: formData.selectedFormats
        .map((format) => normalizeMatchFormatForCategory(format, selectedCategory))
        .filter((format, index, collection) => collection.indexOf(format) === index),
      tournamentType: formData.communityId ? (data.tournamentType || 'CLUB') : 'PUBLIC',
      visibility: data.visibility,
      isRanked: data.isRanked,
      registrationMode: data.registrationMode,
      maxParticipants: data.maxParticipants === '' ? null : Number(data.maxParticipants),
      minElo: enableEloLimit && data.minElo !== '' && data.minElo !== undefined ? Number(data.minElo) : null,
      maxElo: enableEloLimit && data.maxElo !== '' && data.maxElo !== undefined ? Number(data.maxElo) : null,
      maxCombinedElo: enableEloLimit && data.maxCombinedElo !== '' && data.maxCombinedElo !== undefined ? Number(data.maxCombinedElo) : null,
      maxTeammateGap: enableEloLimit && data.maxTeammateGap !== '' && data.maxTeammateGap !== undefined ? Number(data.maxTeammateGap) : null,
    });
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Tạo Giải đấu mới</h2>
        <p className="text-sm text-slate-500">Cấu hình nhanh các thông số cơ bản cho Giải đấu của bạn.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          label="Tên Giải đấu"
          placeholder="Ví dụ: Hanoi Open Spring 2026"
          {...register('name')}
          error={errors.name?.message}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Bộ môn thi đấu <span className="text-rose-500">*</span></label>
            <select 
              {...register('categoryId')} 
              className={`border rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
                errors.categoryId ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
              }`}
              disabled={isLoading}
            >
              <option value="">{isLoading ? 'Đang tải...' : '-- Chọn bộ môn --'}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs font-semibold text-rose-500">{errors.categoryId.message}</p>}
          </div>

          <div className="flex flex-col">
            <Input
              label="Số đội tham gia tối đa"
              placeholder="Ví dụ: 16"
              type="number"
              {...register('maxParticipants')}
              error={errors.maxParticipants?.message}
            />
            <p className="text-[11px] text-slate-400 mt-1 font-semibold pl-1">
              💡 Lưu ý: Số đội tham gia có thể chỉnh sửa cấu hình chi tiết ở các bước thiết lập vòng đấu sau.
            </p>
          </div>
        </div>

        {formData.communityId && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-900">Đối tượng tham gia <span className="text-rose-500">*</span></label>
            <div className="flex flex-col sm:flex-row gap-4 mt-1">
              <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    value="CLUB"
                    {...register('tournamentType')}
                    checked={watchTournamentType === 'CLUB'}
                    onChange={() => setValue('tournamentType', 'CLUB')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-sm font-bold text-slate-800">Giải nội bộ CLB</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                  Chỉ thành viên của câu lạc bộ này đủ điều kiện gửi đăng ký. Hoàn toàn miễn phí xuất bản giải đấu.
                </span>
              </label>

              <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    value="PUBLIC"
                    {...register('tournamentType')}
                    checked={watchTournamentType === 'PUBLIC'}
                    onChange={() => setValue('tournamentType', 'PUBLIC')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-sm font-bold text-slate-800">Giải đấu mở rộng</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                  Người dùng ngoài câu lạc bộ có thể gửi đăng ký theo cách tiếp nhận bạn chọn bên dưới. Phí xuất bản áp dụng theo loại giải.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Ranked or Unranked Option */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-900">Cách tính thành tích <span className="text-rose-500">*</span></label>
          <div className="flex gap-6 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="isRanked" 
                checked={watchIsRanked === true} 
                onChange={() => setValue('isRanked', true)} 
                className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
              />
              <span className="text-sm font-semibold text-slate-800">Xếp hạng hệ thống (Ranked)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="isRanked" 
                checked={watchIsRanked === false} 
                onChange={() => setValue('isRanked', false)} 
                className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
              />
              <span className="text-sm font-semibold text-slate-800">Giải phong trào (Unranked)</span>
            </label>
          </div>
          
          <div className="mt-1 text-xs leading-relaxed text-slate-500 border-t border-slate-200/60 pt-3">
            {watchTournamentType === 'CLUB' ? (
              <p className="text-slate-600 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/50">
                💡 <strong>Giải đấu Nội bộ CLB:</strong> Miễn phí xuất bản hoàn toàn (0đ). Phí sàn lệ phí tham gia là <strong>{fees.pctClub}%</strong>. Điểm xếp hạng chỉ được tính nội bộ trong câu lạc bộ của bạn, Giải đấu tự động hoạt động ngay lập tức mà không cần Admin duyệt.
              </p>
            ) : watchIsRanked ? (
              <p className="text-slate-600 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/50">
                💡 <strong>Giải đấu Xếp hạng:</strong> Phí xuất bản Giải đấu là <strong>{(fees.feePublicRanked / 1000).toString()}k VND</strong> (thanh toán khi xuất bản). Phí sàn <strong>{fees.pctPublicRanked}%</strong> trên lệ phí tham gia của mỗi người nếu có thu phí. Điểm ELO của người chơi sẽ được tính toán trên bảng xếp hạng chung. Giải đấu cần sự phê duyệt của Admin trước khi hoạt động công khai.
              </p>
            ) : (
              <p className="text-slate-600 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/50">
                💡 <strong>Giải phong trào:</strong> Phí xuất bản Giải đấu là <strong>{(fees.feePublicUnranked / 1000).toString()}k VND</strong> (thanh toán khi xuất bản). Phí sàn <strong>{fees.pctPublicUnranked}%</strong> trên lệ phí tham gia của mỗi người nếu có thu phí. Không tính điểm ELO, Giải đấu tự động hoạt động ngay lập tức mà không cần Admin kiểm duyệt.
              </p>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-900">Hiển thị giải đấu <span className="text-rose-500">*</span></label>
          <p className="text-xs text-slate-500">Chỉ quyết định cộng đồng có tìm thấy giải hay không, độc lập với cách duyệt đăng ký.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
            <label className={`flex flex-col p-4 border rounded-lg bg-white cursor-pointer transition-all ${watchVisibility === 'PUBLIC' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <input type="radio" value="PUBLIC" {...register('visibility')} checked={watchVisibility === 'PUBLIC'} onChange={() => setValue('visibility', 'PUBLIC')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-bold text-slate-800">Công khai</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                {watchTournamentType === 'CLUB'
                  ? 'Xuất hiện trên trang câu lạc bộ của bạn, thành viên và khách ghé thăm đều có thể theo dõi sơ đồ đấu.'
                  : 'Xuất hiện trên trang chủ, khám phá và có thể được cộng đồng theo dõi.'}
              </span>
            </label>

            <label className={`flex flex-col p-4 border rounded-lg bg-white cursor-pointer transition-all ${watchVisibility === 'PRIVATE' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <input type="radio" value="PRIVATE" {...register('visibility')} checked={watchVisibility === 'PRIVATE'} onChange={() => setValue('visibility', 'PRIVATE')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-bold text-slate-800">Không niêm yết</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                {watchTournamentType === 'CLUB'
                  ? 'Không xuất hiện trên trang CLB; chỉ người có link hoặc mã mời mới có thể truy cập.'
                  : 'Không xuất hiện công khai; người có link hoặc mã mời vẫn có thể truy cập.'}
              </span>
            </label>
          </div>
        </div>

        {/* Registration Mode Option */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-900">Chế độ đăng ký giải đấu <span className="text-rose-500">*</span></label>
          <div className="flex flex-col md:flex-row gap-4 mt-1">
            <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  value="OPEN"
                  {...register('registrationMode')}
                  checked={watchRegistrationMode === 'OPEN'}
                  onChange={() => setValue('registrationMode', 'OPEN')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm font-bold text-slate-800">Tự do</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                Mọi VĐV đăng ký tham gia được chốt danh sách và tham gia giải ngay lập tức.
              </span>
            </label>

            <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  value="APPROVAL"
                  {...register('registrationMode')}
                  checked={watchRegistrationMode === 'APPROVAL'}
                  onChange={() => setValue('registrationMode', 'APPROVAL')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm font-bold text-slate-800">Xét duyệt</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                Đăng ký của VĐV sẽ ở trạng thái chờ duyệt (PENDING). Người tổ chức duyệt thủ công.
              </span>
            </label>

            <label className="flex-1 flex flex-col p-4 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all relative border-slate-200">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  value="INVITE_ONLY"
                  {...register('registrationMode')}
                  checked={watchRegistrationMode === 'INVITE_ONLY'}
                  onChange={() => setValue('registrationMode', 'INVITE_ONLY')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm font-bold text-slate-800">Chỉ nhận mã mời</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-2 pl-6 leading-relaxed">
                Chỉ những VĐV có mã mời/link mời mới đăng ký tham gia được.
              </span>
            </label>
          </div>
        </div>

        {/* ELO Constraints Section */}
        {watchIsRanked && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableEloLimit}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEnableEloLimit(checked);
                  if (!checked) {
                    setValue('minElo', '');
                    setValue('maxElo', '');
                    setValue('maxCombinedElo', '');
                    setValue('maxTeammateGap', '');
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <h4 className="text-sm font-bold text-slate-800">Giới hạn trình độ ELO (Tùy chọn)</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bật tùy chọn này để thiết lập khoảng ELO cho phép của các vận động viên đăng ký giải đấu này.
                </p>
              </div>
            </label>

            {enableEloLimit && (
              <div className="space-y-4 pt-2 border-t border-slate-200/80 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="ELO tối thiểu (Min ELO)"
                    placeholder="Ví dụ: 800"
                    type="number"
                    {...register('minElo')}
                    error={errors.minElo?.message}
                  />
                  <Input
                    label="ELO tối đa (Max ELO)"
                    placeholder="Ví dụ: 1500"
                    type="number"
                    {...register('maxElo')}
                    error={errors.maxElo?.message}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/60 pt-3">
                  <Input
                    label="Tổng ELO cặp đôi tối đa"
                    placeholder="Ví dụ: 2800"
                    type="number"
                    {...register('maxCombinedElo')}
                    error={errors.maxCombinedElo?.message}
                  />
                  <Input
                    label="Chênh lệch ELO tối đa giữa đồng đội"
                    placeholder="Ví dụ: 300"
                    type="number"
                    {...register('maxTeammateGap')}
                    error={errors.maxTeammateGap?.message}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bracket Type Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-slate-700">Thể thức thi đấu</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'SINGLE_ELIMINATION' as const, label: 'Loại Trực Tiếp', icon: Trophy, desc: 'Đội thua sẽ bị loại ngay lập tức.' },
              { id: 'DOUBLE_ELIMINATION' as const, label: 'Nhánh Thắng / Nhánh Thua', icon: LayoutGrid, desc: 'Đội thua một trận rớt xuống nhánh thua.' },
              { id: 'ROUND_ROBIN' as const, label: 'Vòng Tròn Tính Điểm', icon: RotateCw, desc: 'Các đội trong bảng gặp nhau ít nhất một lượt.' },
              { id: 'GROUP_STAGE_KNOCKOUT' as const, label: 'Vòng Bảng + Loại Trực Tiếp', icon: Shield, desc: 'Chia bảng đấu vòng tròn, sau đó chọn đội vào vòng loại trực tiếp.' },
            ].map((opt) => {
              const isSelected = selectedFormat === opt.id;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedFormat(opt.id)}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className={`font-bold mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>{opt.label}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                </div>
              );
            })}
          </div>
        </div>



        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Mô tả Giải đấu</label>
          <Textarea
            placeholder="Giới thiệu sơ lược về giải đấu..."
            className="h-24 resize-none"
            {...register('description')}
          />
          {errors.description && <p className="text-xs font-semibold text-rose-500">{errors.description.message}</p>}
        </div>

        <div className="flex justify-end mt-4 pt-6 border-t border-slate-100">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5">
            Tiếp tục <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}

