"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { useAuthStore, User } from "@/lib/zustand/authStore";
import toast from "react-hot-toast";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        const user = await api.get<User>("/auth/me");
        if (user) {
          useAuthStore.getState().setUser(user);
          toast.success("Đăng nhập thành công!");
          router.replace("/");
        } else {
          throw new Error("Không thể lấy thông tin người dùng.");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        toast.error("Đăng nhập thất bại. Vui lòng thử lại.");
        router.replace("/login");
      }
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="text-sm font-medium text-muted-foreground">Đang hoàn tất đăng nhập Google...</p>
    </div>
  );
}
