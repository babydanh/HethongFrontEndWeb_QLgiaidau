"use client";

import { useEffect, useRef, useState } from "react";
import { X, MessageCircle, User, ShieldCheck, Crown, Shield, Tag, Loader2 } from "lucide-react";
import { usersApi } from "@/features/users/api";
import { useRouter } from "next/navigation";
import CommunityAvatar from "@/app/(public)/communities/[id]/components/CommunityAvatar";

export interface PopoverUserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  role?: "OWNER" | "MODERATOR" | "MEMBER" | string;
  tags?: string[];
  bio?: string | null;
  joinedAt?: string | null;
}

interface UserProfilePopoverProps {
  user: PopoverUserProfile | null;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  communityId?: string;
}

export default function UserProfilePopover({
  user,
  anchorRect,
  isOpen,
  onClose,
  communityId,
}: UserProfilePopoverProps) {
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [profileData, setProfileData] = useState<PopoverUserProfile | null>(user);
  const [loading, setLoading] = useState(false);

  // Sync user and fetch additional details if needed
  useEffect(() => {
    if (!isOpen || !user) return;
    setProfileData(user);

    if (user.id && !user.bio) {
      setLoading(true);
      usersApi
        .getUserById(user.id)
        .then((profile) => {
          if (profile) {
            setProfileData((prev) => ({
              ...prev,
              ...user,
              bio: profile.bio || null,
              avatarUrl: profile.avatarUrl || user.avatarUrl,
              fullName: profile.fullName || user.fullName,
            }));
          }
        })
        .catch(() => {
          // fallback to initial user
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, user]);

  // Click outside and Esc key handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !profileData || !anchorRect) return null;

  // Tính toán vị trí hiển thị popover thông minh (tránh tràn viewport)
  const popoverWidth = 320;
  const popoverHeight = 240;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  let top = anchorRect.bottom + scrollY + 8;
  let left = anchorRect.left + scrollX;

  // Nếu tràn cạnh phải màn hình
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }
  if (left < 16) {
    left = 16;
  }

  // Nếu tràn đáy màn hình, hiển thị phía trên anchor
  if (anchorRect.bottom + popoverHeight > window.innerHeight && anchorRect.top > popoverHeight) {
    top = anchorRect.top + scrollY - popoverHeight - 8;
  }

  const roleLabel =
    profileData.role === "OWNER"
      ? "Chủ nhiệm CLB"
      : profileData.role === "MODERATOR"
        ? "Quản trị viên"
        : "Thành viên CLB";

  const RoleIcon =
    profileData.role === "OWNER"
      ? Crown
      : profileData.role === "MODERATOR"
        ? ShieldCheck
        : Shield;

  return (
    <div
      ref={popoverRef}
      style={{
        top: `${top}px`,
        left: `${left}px`,
        position: "absolute",
      }}
      className="z-[99999] w-80 animate-in fade-in zoom-in-95 duration-150 rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden text-slate-800"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mini Cover Header */}
      <div className="relative h-18 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Profile Body */}
      <div className="relative px-4 pb-4 pt-0">
        {/* Avatar positioned over header */}
        <div className="-mt-9 mb-2.5 flex items-end justify-between">
          <div className="relative rounded-full border-3 border-white shadow-md bg-white">
            <CommunityAvatar
              src={profileData.avatarUrl}
              name={profileData.fullName}
              size={54}
            />
          </div>
          {profileData.role && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200 shadow-xs">
              <RoleIcon className="h-3 w-3 text-emerald-600" />
              {roleLabel}
            </span>
          )}
        </div>

        {/* Name and Info */}
        <div className="min-w-0">
          <h4 className="truncate text-base font-bold text-slate-900">
            {profileData.fullName}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {profileData.joinedAt
              ? `Tham gia từ ${new Date(profileData.joinedAt).toLocaleDateString("vi-VN")}`
              : "Thành viên tích cực"}
          </p>
        </div>

        {/* Bio if available */}
        {profileData.bio && (
          <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
            {profileData.bio}
          </p>
        )}

        {/* Tags if any */}
        {(profileData.tags ?? []).length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {profileData.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-100"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="mt-4 flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (communityId) {
                // Điều hướng tới mục Chat của CLB hoặc nhắn tin
                router.push(`/communities/${communityId}?tab=overview`);
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-98"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Nhắn tin
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/profile`);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 active:scale-98 border border-slate-200/80"
          >
            <User className="h-3.5 w-3.5" />
            Trang cá nhân
          </button>
        </div>
      </div>
    </div>
  );
}
