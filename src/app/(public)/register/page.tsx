'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api, getBaseUrl } from '@/lib/axios';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import * as React from 'react';
import { useAuthStore } from '@/lib/zustand/authStore';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const HIGHLIGHTS = [
  'Đăng ký và thi đấu trong vài phút',
  'Hệ thống ELO xếp hạng minh bạch',
  'Cộng đồng hàng nghìn vận động viên',
];

const STATS = [
  { value: '5,000+', label: 'Giải đấu' },
  { value: '50K+', label: 'Vận động viên' },
  { value: '120+', label: 'Tỉnh thành' },
];

export default function RegisterPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Auto redirect to homepage if user is already logged in
  React.useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Reset loading state when navigating back (BFCache handling)
  React.useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsLoading(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      router.push('/login');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || 'Đăng ký thất bại.');
      } else {
        toast.error('Đăng ký thất bại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = `${getBaseUrl()}/auth/google`;
  };

  return (
    <div className="flex flex-1 min-h-[100dvh] bg-white">
      {/* ── Left: sport photo + overlay ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden"
        style={{
          backgroundImage: "url('https://picsum.photos/seed/vndc-sport-tennis-court/900/1200')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/55 to-slate-900/90" />

        {/* Logo — larger */}
        <div className="relative z-10 p-10">
          <img
            src="/vndcsport.svg"
            alt="Sporto"
            className="h-16 w-auto object-contain brightness-200 contrast-0"
          />
        </div>

        {/* Headline + list */}
        <div className="relative z-10 px-10 pb-4">
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Tham gia ngay
            <br />
            <span className="text-blue-400">cộng đồng thi đấu</span>
            <br />
            hàng đầu
          </h1>
          <p className="mt-3 text-slate-300 text-sm leading-relaxed max-w-[320px]">
            Đăng ký miễn phí để bắt đầu hành trình chinh phục các giải đấu thể thao.
          </p>

          <ul className="mt-5 space-y-2.5">
            {HIGHLIGHTS.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.45 }}
                className="flex items-center gap-2.5 text-sm text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                {item}
              </motion.li>
            ))}
          </ul>

          {/* Stats strip */}
          <div className="mt-8 flex gap-6">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-white leading-none">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-10 pt-0">
          <p className="text-slate-500 text-xs">© 2025 Sporto</p>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden py-10">
        {/* Decorative bg blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-70" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-70" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-[400px] px-4"
        >
          {/* Form card */}
          <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-8 py-7">
            {/* Logo inside card */}
            <div className="flex items-center gap-2.5 mb-5">
              <img
                src="/vndcsport.svg"
                alt="Sporto"
                className="h-14 w-auto object-contain"
              />
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Tạo tài khoản</h2>
            <p className="mt-1 text-sm text-slate-500">
              Bắt đầu tham gia và tổ chức các giải đấu thể thao
            </p>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              className="mt-5 w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-semibold text-slate-700 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Đăng ký bằng Google
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">hoặc</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Họ và tên</label>
                <Input placeholder="Nguyễn Văn A" {...register('fullName')} error={errors.fullName?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <Input type="email" placeholder="name@example.com" {...register('email')} error={errors.email?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-11" {...register('password')} error={errors.password?.message} />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-3 top-[13px] z-10 text-slate-400 transition-colors hover:text-slate-700">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-11" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
                  <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'} className="absolute right-3 top-[13px] z-10 text-slate-400 transition-colors hover:text-slate-700">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg shadow-sm transition-all cursor-pointer text-sm mt-1"
              >
                {isLoading ? 'Đang xử lý...' : 'Tạo tài khoản'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Đã có tài khoản?{' '}
              <Link href="/login" className="font-bold text-blue-600 hover:underline">
                Đăng nhập ngay
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            Bảo mật SSL · Không chia sẻ thông tin cá nhân
          </p>
        </motion.div>
      </div>
    </div>
  );
}

