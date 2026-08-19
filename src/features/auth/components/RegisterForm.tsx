"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, Lock, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { authApi } from "@/features/auth/api";
import { getBaseUrl } from "@/lib/axios";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const RegisterForm = () => {
  const translate = useTranslations('Auth');
  const registerSchema = React.useMemo(
    () => z.object({
      name: z.string().min(3, { message: translate('validationNameMin') }),
      email: z.string().email({ message: translate('validationEmail') }),
      password: z.string().min(6, { message: translate('validationPasswordMin') }),
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: translate('passwordMismatch'),
      path: ['confirmPassword'],
    }),
    [translate],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const router = useRouter();

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await authApi.register({
        email: registerData.email,
        password: registerData.password,
        fullName: registerData.name, // Mapping 'name' to 'fullName'
      });
      
      toast.success(translate('registerSuccess'));
      // Ideally toggle to login tab or redirect
      router.push("/auth/login");
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        toast.error(axiosError.response?.data?.message || translate('registrationFailedExisting'));
      } else {
        toast.error(translate('registrationFailedUnknown'));
      }
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${getBaseUrl()}/auth/google`;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium leading-none">{translate('fullName')}</label>
        <Input
          id="name"
          type="text"
          placeholder={translate('namePlaceholder')}
          icon={<UserIcon className="h-5 w-5 text-muted-foreground" />}
          {...register("name")}
        />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          icon={<Mail className="h-5 w-5 text-muted-foreground" />}
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium leading-none">{translate('password')}</label>
        <Input
          id="password"
          type="password"
          icon={<Lock className="h-5 w-5 text-muted-foreground" />}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-danger">{errors.password.message}</p>
        )}
      </div>
       <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">{translate('confirmPassword')}</label>
        <Input
          id="confirmPassword"
          type="password"
          icon={<Lock className="h-5 w-5 text-muted-foreground" />}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-danger">{errors.confirmPassword.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        {translate('createAccountWithEmail')}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-muted"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">{translate('or')}</span>
        </div>
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        {translate('continueWithGoogle')}
      </Button>
    </form>
  );
};

