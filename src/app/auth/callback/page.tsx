"use client";

import { useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/zustand/authStore";
import type { User } from "@/lib/zustand/authStore";
import { usersApi } from "@/features/users/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { BRAND } from "@/constants/brand";

const CallbackContent = () => {
  const t = useTranslations('Auth');
  const router = useRouter();

  useEffect(() => {
    // Trình duyệt đã lưu cookies accessToken và refreshToken sau khi redirect từ Backend.
    // Gọi API lấy profile, axios sẽ tự động đính kèm cookie accessToken nhờ withCredentials: true.
    usersApi.getProfile()
      .then((data) => {
        const nextUser: User = {
          id: data.id,
          email: data.email,
          fullName: data.fullName || data.email,
          avatarUrl: data.avatarUrl ?? null,
          coverUrl: data.coverUrl ?? null,
          roles: Array.isArray(data.roles) ? data.roles : [],
          phoneNumber: data.phoneNumber ?? null,
          dateOfBirth: data.dateOfBirth ?? null,
          gender: data.gender ?? null,
          address: data.address ?? null,
          provinceCode: data.provinceCode ?? null,
          bio: data.bio ?? null,
        };
        useAuthStore.getState().setUser(nextUser);
        toast.success(t("loginSuccess"));
        router.push("/");
      })
      .catch((error) => {
        console.error("Lỗi khi lấy thông tin user:", error);
        toast.error(t("authError"));
        router.push("/login");
      });
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center space-y-6"
      >
        <div className="relative w-32 h-32 flex items-center justify-center mb-2">
            <img
            src={BRAND.assets.logoIcon}
            alt={`${BRAND.name} Logo`}
            className="w-full h-full object-contain animate-pulse"
          />
        </div>

        <div className="space-y-2 flex flex-col items-center">
          <p className="text-slate-650 font-bold text-base">{t('syncingGoogleAccount')}</p>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </motion.div>
    </div>
  );
};

function AuthCallbackLoading() {
  const t = useTranslations('Auth');
  return <div className="flex h-screen items-center justify-center">{t("loading")}</div>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <CallbackContent />
    </Suspense>
  );
}

