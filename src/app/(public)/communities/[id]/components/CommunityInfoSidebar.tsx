"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Image as ImageIcon, MessageCircle, ArrowUpRight, Globe } from "lucide-react";
import { communitiesApi } from "@/features/communities/api";
import { Button } from "@/components/ui/Button";

interface CommunityInfoSidebarProps {
  communityId: string;
  description?: string;
  rules?: string;
  socialLinks?: Record<string, string>;
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
  socialLinks,
  onGoToGallery,
  onOpenChat,
}: CommunityInfoSidebarProps) {
  const translate = useTranslations("Common");
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

  const hasSocialLinks = socialLinks && Object.keys(socialLinks).length > 0;

  return (
    <aside className="space-y-5 lg:sticky lg:top-24">
      {/* 💬 Card Vào Chat Chung CLB */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-600" strokeWidth={2} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">{translate("communityChatTitle")}</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {translate("communityActive")}
          </span>
        </div>
        <Button
          type="button"
          onClick={() => {
            if (onOpenChat) onOpenChat();
            else if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("sporto:open-club-chat", {
                  detail: { communityId },
                })
              );
            }
          }}
          className="w-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs h-9 rounded-lg active:scale-[0.98] shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{translate("communityOpenChat")}</span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
        </Button>
      </section>

      {/* 📖 Card Thông Tin CLB */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-blue-600" strokeWidth={2} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">{translate("communityInfoTitle")}</h3>
        </div>
        <div className="space-y-4 text-sm leading-6 text-slate-700">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{translate("communityAbout")}</p>
            <p className="whitespace-pre-line break-words text-slate-700 text-xs leading-relaxed font-normal">
              {description?.trim() || translate("communityNoDescription")}
            </p>
          </div>
          <div className="border-t border-slate-100 pt-3.5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{translate("communityRules")}</p>
            {rules?.trim() ? (
              <p className="whitespace-pre-line break-words text-slate-700 text-xs leading-relaxed font-normal">
                {rules.trim().split(/(\s+)/).map((part, idx) => {
                  if (part.startsWith('http://') || part.startsWith('https://')) {
                    return (
                      <a
                        key={idx}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                      >
                        {part}
                        <ArrowUpRight className="w-3 h-3 inline shrink-0" />
                      </a>
                    );
                  }
                  return part;
                })}
              </p>
            ) : (
              <p className="text-slate-400 text-xs font-normal italic">
                {translate("communityNoRules")}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 🌐 Card Kênh Liên Hệ & Mạng Xã Hội */}
      {hasSocialLinks && (
        <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="mb-3.5 flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" strokeWidth={2} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">{translate("communityContactSocial")}</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(socialLinks!).map(([key, val]) => {
              const displayLabel = key.charAt(0).toUpperCase() + key.slice(1);
              const isUrl = val.startsWith("http://") || val.startsWith("https://");
              return (
                <div key={key} className="flex items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs">
                  <span className="font-bold text-slate-700 shrink-0">{displayLabel}:</span>
                  {isUrl ? (
                    <a
                      href={val}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate flex items-center gap-1 font-medium"
                    >
                      <span className="truncate">{val}</span>
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-slate-800 font-medium truncate">{val}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 🖼️ Card Thư Viện Ảnh */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <ImageIcon className="h-4 w-4 text-blue-600" strokeWidth={2} />
            {translate("communityGallery")}
          </h3>
          {onGoToGallery && (
            <button
              type="button"
              onClick={onGoToGallery}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              {translate("communityViewAll")}
            </button>
          )}
        </div>
        {gallery.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-8 text-center text-xs font-semibold text-slate-500">
            {translate("communityNoActivityImages")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gallery.slice(0, 4).map((image) => (
              <img
                key={image.id}
                src={image.imageUrl}
                alt={translate("communityActivityImageAlt")}
                className="aspect-square w-full rounded-lg object-cover shadow-2xs"
              />
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
