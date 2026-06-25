'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/axios';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const resetSchema = z.object({
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu nhập lại không khớp',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const [done, setDone] = useState(false);

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      toast.error('Thiếu mã xác thực. Vui lòng sử dụng link từ email.');
      return;
    }
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setDone(true);
      toast.success('Mật khẩu đã được đặt lại thành công!');
    } catch {
      toast.error('Token không hợp lệ hoặc đã hết hạn.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Liên kết không hợp lệ</h1>
          <p className="text-sm text-slate-500 mb-6">Vui lòng sử dụng liên kết từ email đặt lại mật khẩu.</p>
          <Link href="/forgot-password" className="text-sm font-bold text-blue-600 hover:underline">
            Gửi yêu cầu mới
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Đặt lại mật khẩu thành công!</h1>
          <p className="text-sm text-slate-500 mb-6">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
          <Link href="/login" className="inline-block px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/login" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Đặt lại mật khẩu</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu mới</label>
            <Input type="password" placeholder="••••••••" {...register('password')} error={errors.password?.message} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nhập lại mật khẩu</label>
            <Input type="password" placeholder="••••••••" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl">
            {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </Button>
        </form>
      </div>
    </div>
  );
}
