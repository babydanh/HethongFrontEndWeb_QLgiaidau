'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useCreateTournamentStore } from '@/lib/zustand/createTournamentStore';
import { categoriesApi, Category } from '@/features/categories/api';
import { trimAndNormalizeSpaces } from '@/utils/string';
import { ChevronRight } from 'lucide-react';

const step1Schema = z.object({
  name: z.string().min(5, 'Tên giải đấu phải có ít nhất 5 ký tự').max(150, 'Tên giải đấu quá dài'),
  description: z.string().max(1000, 'Mô tả tối đa 1000 ký tự').optional(),
  categoryId: z.string().min(1, 'Vui lòng chọn bộ môn thi đấu'),
  tournamentType: z.enum(['CLUB', 'PUBLIC']),
  matchType: z.enum(['SINGLES', 'DOUBLES', 'MIXED_DOUBLES']),
  maxParticipants: z.string().refine((val) => {
    if (val === '') return true;
    const num = Number(val);
    return !isNaN(num) && num >= 2;
  }, 'Số đội tối đa phải là số lớn hơn hoặc bằng 2'),
});

type Step1Values = z.infer<typeof step1Schema>;

export default function Step1Info() {
  const { formData, updateFormData, nextStep } = useCreateTournamentStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: formData.name,
      description: formData.description,
      categoryId: formData.categoryId,
      tournamentType: formData.communityId ? 'CLUB' : formData.tournamentType,
      matchType: formData.matchType,
      maxParticipants: formData.maxParticipants ? String(formData.maxParticipants) : '16',
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesApi.getCategories();
        if (res.data) setCategories(res.data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = (data: Step1Values) => {
    updateFormData({
      name: trimAndNormalizeSpaces(data.name),
      description: data.description ? trimAndNormalizeSpaces(data.description) : '',
      categoryId: data.categoryId,
      tournamentType: data.tournamentType,
      matchType: data.matchType,
      maxParticipants: data.maxParticipants === '' ? null : Number(data.maxParticipants),
    });
    nextStep();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Thông tin giải đấu</h2>
        <p className="text-sm text-slate-500">Cấu hình nhanh các thông số cơ bản cho giải đấu của bạn.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          label="Tên giải đấu"
          placeholder="Ví dụ: Hanoi Open Spring 2026"
          {...register('name')}
          error={errors.name?.message}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Bộ môn thi đấu <span className="text-red-500">*</span></label>
            <select 
              {...register('categoryId')} 
              className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              disabled={isLoading}
            >
              <option value="">{isLoading ? 'Đang tải...' : '-- Chọn bộ môn --'}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs font-semibold text-red-500">{errors.categoryId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Hình thức thi đấu <span className="text-red-500">*</span></label>
            <select 
              {...register('matchType')} 
              className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SINGLES">Đơn (Singles)</option>
              <option value="DOUBLES">Đôi (Doubles)</option>
              <option value="MIXED_DOUBLES">Đôi nam nữ (Mixed)</option>
            </select>
            {errors.matchType && <p className="text-xs font-semibold text-red-500">{errors.matchType.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Số đội tham gia tối đa"
            placeholder="Ví dụ: 16"
            type="number"
            {...register('maxParticipants')}
            error={errors.maxParticipants?.message}
          />

          {!formData.communityId && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Phạm vi giải đấu <span className="text-red-500">*</span></label>
              <div className="flex gap-4 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="PUBLIC" {...register('tournamentType')} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Công khai (Public)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="CLUB" {...register('tournamentType')} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">Nội bộ CLB (Club)</span>
                </label>
              </div>
              {errors.tournamentType && <p className="text-xs font-semibold text-red-500">{errors.tournamentType.message}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Mô tả giải đấu</label>
          <Textarea
            placeholder="Giới thiệu sơ lược về giải đấu..."
            className="h-24 resize-none"
            {...register('description')}
          />
          {errors.description && <p className="text-xs font-semibold text-red-500">{errors.description.message}</p>}
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
