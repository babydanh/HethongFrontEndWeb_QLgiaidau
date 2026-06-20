"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/zustand/authStore";
import { usersApi } from "@/features/users/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

const CallbackContent = () => {
  const router = useRouter();

  useEffect(() => {
    // Trình duyệt đã lưu cookies accessToken và refreshToken sau khi redirect từ Backend.
    // Gọi API lấy profile, axios sẽ tự động đính kèm cookie accessToken nhờ withCredentials: true.
    usersApi.getProfile()
      .then((data) => {
        useAuthStore.getState().setUser(data as any);
        toast.success("Đăng nhập thành công!");
        router.push("/");
      })
      .catch((error) => {
        console.error("Lỗi khi lấy thông tin user:", error);
        toast.error("Lỗi xác thực, vui lòng thử lại.");
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
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20 z-10 relative">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <div className="absolute inset-0 bg-blue-600 rounded-2xl animate-ping opacity-20"></div>
        </div>
        
        <div className="space-y-2 flex flex-col items-center">
          <img 
            src="/images/vndc_sport.png" 
            alt="VNDC Sport Logo" 
            className="h-12 w-auto object-contain mb-2"
          />
          <p className="text-slate-500 font-medium">Đang đồng bộ tài khoản Google của bạn...</p>
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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Đang tải...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
