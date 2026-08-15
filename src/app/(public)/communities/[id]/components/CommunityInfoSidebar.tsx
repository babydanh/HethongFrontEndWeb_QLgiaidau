"use client";

import { useEffect, useState } from "react";
import { BookOpen, Image as ImageIcon, MessageCircle, ArrowUpRight } from "lucide-react";
import { communitiesApi } from "@/features/communities/api";
import { Button } from "@/components/ui/Button";

interface CommunityInfoSidebarProps {
  communityId: string;
  description?: string;
  rules?: string;
  onGoToGallery?: () => void;
  onOpenChat?: () => void;
}

interface GalleryPreview {
  id: string;
  imageUrl: string;
}

export default function CommunityInfoSidebar({
  communityId,
  description,
  rules,
  onGoToGallery,
  onOpenChat,
}: CommunityInfoSidebarProps) {
  const [gallery, setGallery] = useState<GalleryPreview[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(async () => {
      const [galleryResult] = await Promise.allSettled([communitiesApi.getGallery(communityId)]);
      if (!mounted) return;
      if (galleryResult.status === "fulfilled") {
        const raw: unknown = galleryResult.value.data;
        const items = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && "data" in raw && Array.isArray(raw.data)
            ? raw.data
            : [];
        setGallery(
          items.filter(
            (item): item is GalleryPreview =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof item.id === "string" &&
              typeof item.imageUrl === "string",
          ),
        );
      }
    });
    return () => {
      mounted = false;
    };
  }, [communityId]);

  return (
    <aside className="space-y-5 lg:sticky lg:top-24">
      {/* 💬 Card Vào Chat Chung CLB (Tối Giản, Nền Trắng Tinh Gọn) */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-slate-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Chat CLB
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Hoạt động
          </span>
        </div>

        <Button
          type="button"
          onClick={onOpenChat}
          className="w-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs h-9 rounded-lg active:scale-[0.98]"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Vào phòng Chat</span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
        </Button>
      </section>

      {/* 📖 Card Thông Tin CLB */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#0d8fd4]" strokeWidth={2} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Thông tin CLB</h3>
        </div>
        <div className="space-y-4 text-sm leading-6 text-slate-700">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Giới thiệu</p>
            <p className="whitespace-pre-line break-words text-slate-700 font-normal">
              {description?.trim() || "Chưa có giới thiệu cho câu lạc bộ."}
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Luật lệ & quy tắc</p>
            <p className="whitespace-pre-line break-words text-slate-700 font-normal">
              {rules?.trim() || "Câu lạc bộ chưa cập nhật luật lệ riêng."}
            </p>
          </div>
        </div>
      </section>

      {/* 🖼️ Card Thư Viện Ảnh */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
            <ImageIcon className="h-4 w-4 text-[#0d8fd4]" strokeWidth={2} />
            Thư viện ảnh
          </h3>
          {onGoToGallery && (
            <button
              type="button"
              onClick={onGoToGallery}
              className="text-xs font-bold text-[#0d8fd4] hover:text-[#044a72]"
            >
              Xem tất cả
            </button>
          )}
        </div>
        {gallery.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-8 text-center text-xs font-semibold text-slate-500">
            Chưa có ảnh hoạt động
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gallery.slice(0, 4).map((image) => (
              <img
                key={image.id}
                src={image.imageUrl}
                alt="Ảnh hoạt động CLB"
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
