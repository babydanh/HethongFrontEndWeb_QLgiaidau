"use client";

import { useEffect, useRef, useState } from "react";
import { X, MessageCircle, User, ShieldCheck, Crown, Shield, Tag, Sparkles, CheckCircle2 } from "lucide-react";
import { usersApi } from "@/features/users/api";
import { communitiesApi } from "@/features/communities/api";
import { useRouter } from "next/navigation";
import CommunityAvatar from "@/app/(public)/communities/[id]/components/CommunityAvatar";
import { EloTierBadge } from "@/components/ui/EloTierBadge";

export interface PopoverUserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  role?: "OWNER" | "MODERATOR" | "MEMBER" | string;
  systemRole?: string;
  roles?: string[];
  tags?: string[];
  bio?: string | null;
  joinedAt?: string | null;
  isVerified?: boolean;
  highlightRank?: {
    eloPoints: number;
    tierName?: string | null;
    categoryName?: string | null;
  } | null;
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
  const [fetchedDetails, setFetchedDetails] = useState<Partial<PopoverUserProfile> | null>(null);

  // Derive profileData by merging initial user prop with any fetched details
  const profileData = user
    ? {
        ...user,
        ...(fetchedDetails?.id === user.id ? fetchedDetails : {}),
      }
    : null;

  // Fetch additional details from public profile API and community members
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let isMounted = true;

    // 1. Fetch public profile info (avatar, cover, bio, system role, elo, isVerified)
    usersApi
      .getPublicProfile(user.id)
      .then((publicData) => {
        if (!isMounted || !publicData) return;
        setFetchedDetails((prev) => ({
          ...(prev?.id === user.id ? prev : {}),
          id: user.id,
          bio: publicData.bio || prev?.bio || user.bio || null,
          avatarUrl: publicData.avatarUrl || prev?.avatarUrl || user.avatarUrl,
          coverUrl: publicData.coverUrl || prev?.coverUrl || user.coverUrl,
          fullName: publicData.fullName || prev?.fullName || user.fullName,
          systemRole: publicData.role || prev?.systemRole,
          roles: publicData.roles || prev?.roles,
          isVerified: publicData.isVerified ?? prev?.isVerified ?? user.isVerified,
          highlightRank: publicData.highlightRank ?? prev?.highlightRank ?? user.highlightRank,
          joinedAt: publicData.createdAt || prev?.joinedAt || user.joinedAt,
        }));
      })
      .catch(() => {});

    // 2. Fetch community member role if inside a community
    if (communityId) {
      communitiesApi
        .getMembers(communityId, { limit: 100 })
        .then((res) => {
          if (!isMounted) return;
          const members = (Array.isArray(res.data) ? res.data : (res.data as any)?.data) ?? [];
          const found = Array.isArray(members)
            ? members.find((m: any) => m.user?.id === user.id || m.userId === user.id)
            : null;
          if (found) {
            setFetchedDetails((prev) => ({
              ...(prev?.id === user.id ? prev : {}),
              id: user.id,
              role: found.member?.role || found.role || prev?.role,
              tags: found.member?.tags || found.tags || prev?.tags,
              joinedAt: found.member?.joinedAt || found.joinedAt || prev?.joinedAt,
            }));
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id, user?.bio, user?.avatarUrl, user?.fullName, user?.coverUrl, user?.isVerified, user?.highlightRank, user?.joinedAt, communityId]);

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
  const popoverWidth = 330;
  const popoverHeight = 270;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  let top = anchorRect.bottom + scrollY + 8;
  let left = anchorRect.left + scrollX;

  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }
  if (left < 16) {
    left = 16;
  }

  if (anchorRect.bottom + popoverHeight > window.innerHeight && anchorRect.top > popoverHeight) {
    top = anchorRect.top + scrollY - popoverHeight - 8;
  }

  // Community Role
  const communityRoleLabel =
    profileData.role === "OWNER"
      ? "Chủ nhiệm CLB"
      : profileData.role === "MODERATOR"
        ? "Quản trị viên"
        : profileData.role === "MEMBER"
          ? "Thành viên CLB"
          : null;

  const CommunityRoleIcon =
    profileData.role === "OWNER"
      ? Crown
      : profileData.role === "MODERATOR"
        ? ShieldCheck
        : Shield;

  // System Role helper
  const getSystemRoleBadge = (role?: string) => {
    if (!role) return null;
    switch (role) {
      case "ADMIN":
        return { label: "Admin", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "ORGANIZER":
        return { label: "Ban tổ chức", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "REFEREE":
        return { label: "Trọng tài", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "PLAYER":
      default:
        return { label: "VĐV", color: "bg-sky-50 text-sky-700 border-sky-200" };
    }
  };

  const sysRoleBadge = getSystemRoleBadge(profileData.systemRole);

  return (
    <div
      ref={popoverRef}
      style={{
        top: `${top}px`,
        left: `${left}px`,
        position: "absolute",
      }}
      className="z-[99999] w-[330px] animate-in fade-in zoom-in-95 duration-150 rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden text-slate-800"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cover Header */}
      <div className="relative h-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 overflow-hidden">
        {profileData.coverUrl && (
          <img
            src={profileData.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/15" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Profile Body */}
      <div className="relative px-4 pb-4 pt-0">
        {/* Avatar positioned over header */}
        <div className="-mt-10 mb-2 flex items-end justify-between">
          <div className="relative rounded-full ring-3 ring-white shadow-md bg-white">
            <CommunityAvatar
              src={profileData.avatarUrl}
              name={profileData.fullName}
              size={60}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {/* Community Role Badge */}
            {communityRoleLabel && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs border ${
                  profileData.role === "OWNER"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : profileData.role === "MODERATOR"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <CommunityRoleIcon
                  className={`h-3 w-3 ${
                    profileData.role === "OWNER"
                      ? "text-amber-600"
                      : profileData.role === "MODERATOR"
                        ? "text-blue-600"
                        : "text-slate-500"
                  }`}
                />
                {communityRoleLabel}
              </span>
            )}

            {/* System Role Badge */}
            {sysRoleBadge && !communityRoleLabel && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs border ${sysRoleBadge.color}`}
              >
                <Shield className="h-3 w-3 opacity-70" />
                {sysRoleBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Name, Verified Badge & Sub info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-base font-bold text-slate-900">
              {profileData.fullName}
            </h4>
            {profileData.isVerified && (
              <span title="Tài khoản đã xác minh" className="inline-flex items-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500">
              {profileData.joinedAt
                ? `Tham gia từ ${new Date(profileData.joinedAt).toLocaleDateString("vi-VN")}`
                : "Thành viên"}
            </p>

            {/* ELO Tier Badge if present */}
            {profileData.highlightRank && (
              <EloTierBadge
                elo={profileData.highlightRank.eloPoints}
                tierName={profileData.highlightRank.tierName || undefined}
                size="sm"
              />
            )}
          </div>
        </div>

        {/* Bio if available */}
        {profileData.bio && (
          <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
            {profileData.bio}
          </p>
        )}

        {/* Tags if any */}
        {(profileData.tags ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {profileData.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-100"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="mt-3.5 flex gap-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (communityId) {
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
              if (profileData.id) {
                router.push(`/users/${profileData.id}`);
              }
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
