"use client";

import { useEffect, useState } from "react";
import { BookOpen, Image as ImageIcon, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { communitiesApi } from "@/features/communities/api";
import type { CommunitySocialSettings } from "@/types/community-social";

interface CommunityInfoSidebarProps {
  communityId: string;
  onGoToGallery?: () => void;
}

interface GalleryPreview {
  id: string;
  imageUrl: string;
}

function settingLabel(value: string | boolean): string {
  if (typeof value === "boolean") return value ? "Bật" : "Tắt";
  if (value === "MEMBERS") return "Thành viên";
  if (value === "ADMINS") return "Ban quản trị";
  if (value === "OFF") return "Tắt";
  return value;
}

export default function CommunityInfoSidebar({ communityId, onGoToGallery }: CommunityInfoSidebarProps) {
  const [settings, setSettings] = useState<CommunitySocialSettings | null>(null);
  const [gallery, setGallery] = useState<GalleryPreview[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(async () => {
      const [settingsResult, galleryResult] = await Promise.allSettled([
        communitiesApi.getSocialSettings(communityId),
        communitiesApi.getGallery(communityId),
      ]);
      if (!mounted) return;
      if (settingsResult.status === "fulfilled") setSettings(settingsResult.value.data);
      if (galleryResult.status === "fulfilled") {
        const raw: unknown = galleryResult.value.data;
        const items = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && "data" in raw && Array.isArray(raw.data)
            ? raw.data
            : [];
        setGallery(items.filter((item): item is GalleryPreview => Boolean(item) && typeof item === "object" && typeof item.id === "string" && typeof item.imageUrl === "string"));
      }
    });
    return () => { mounted = false; };
  }, [communityId]);

  const rows = settings ? [
    { icon: Users, label: "Đăng bài", value: settingLabel(settings.postingPolicy) },
    { icon: ShieldCheck, label: "Duyệt bài", value: settingLabel(settings.postApprovalRequired) },
    { icon: MessageCircle, label: "Bình luận", value: settingLabel(settings.commentsEnabled) },
    { icon: MessageCircle, label: "Chat CLB", value: settingLabel(settings.chatEnabled) },
  ] : [];

  return (
    <aside className="space-y-5 lg:sticky lg:top-24">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#3AB5F6]" strokeWidth={1.8} />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Thông tin CLB</h3>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">Luật sinh hoạt và quyền tương tác hiện tại của câu lạc bộ.</p>
        <div className="space-y-3">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-slate-500"><Icon className="h-3.5 w-3.5 text-slate-400" />{label}</span>
              <span className="font-bold text-slate-800">{value}</span>
            </div>
          ))}
          {!settings && <p className="text-xs text-slate-400">Đang tải thiết lập…</p>}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600"><ImageIcon className="h-4 w-4 text-[#3AB5F6]" />Thư viện ảnh</h3>
          {onGoToGallery && <button type="button" onClick={onGoToGallery} className="text-xs font-bold text-[#1596d4] hover:text-[#0b78ad]">Xem tất cả</button>}
        </div>
        {gallery.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-xs font-semibold text-slate-400">Chưa có ảnh hoạt động</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gallery.slice(0, 4).map((image) => <img key={image.id} src={image.imageUrl} alt="Ảnh hoạt động CLB" className="aspect-square w-full rounded-lg object-cover" />)}
          </div>
        )}
      </section>
    </aside>
  );
}
