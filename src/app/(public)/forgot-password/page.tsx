'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/axios';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const forgotSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
      toast.success('Hướng dẫn đặt lại mật khẩu đã được gửi nếu email tồn tại.');
    } catch {
      toast.success('Hướng dẫn đặt lại mật khẩu đã được gửi nếu email tồn tại.');
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/login" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Quên mật khẩu</h1>
        </div>

        {sent ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-slate-700 font-semibold">Đã gửi yêu cầu thành công!</p>
            <p className="text-sm text-slate-500">Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (cả mục Spam).</p>
            {process.env.NODE_ENV !== 'production' && (
              <p className="text-xs text-slate-400 mt-2">(Môi trường demo: token được in ra console backend)</p>
            )}
            <Link href="/login" className="inline-block mt-4 text-sm font-bold text-blue-600 hover:underline">
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-slate-600">
              Nhập email đã đăng ký tài khoản. Hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <Input type="email" placeholder="name@example.com" {...register('email')} error={errors.email?.message} />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl">
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
