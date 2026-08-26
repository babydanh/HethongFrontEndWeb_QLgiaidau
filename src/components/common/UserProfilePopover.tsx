"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from 'next-intl';
import { X, MessageCircle, User, CheckCircle2, Tag, Plus, Check, Loader2 } from "lucide-react";
import { usersApi } from "@/features/users/api";
import { chatApi } from "@/features/chat/api";
import { communitiesApi, MemberStreak, CommunityMemberRecord } from "@/features/communities/api";
import { useRouter } from "next/navigation";
import { EloTierBadge } from "@/components/ui/EloTierBadge";
import { RankAvatar } from "@/components/ui/RankAvatar";
import { useAuthStore } from "@/lib/zustand/authStore";
import { getCommunityTagDisplayName } from '@/app/(public)/communities/[id]/components/tag-display';
import { isPublicRankingEligible } from '@/features/rankings/elo-display';
import toast from "react-hot-toast";

const MAX_MEMBER_TAGS = 3;
const MAX_MEMBER_TAG_LENGTH = 15;
const MEMBER_TAG_PATTERN = /^[\p{L}\p{N} _-]+$/u;

interface PublicProfileRank {
  categoryName?: string | null;
  matchType?: string | null;
  eloPoints: number;
  tierName?: string | null;
  matchesPlayed: number;
  matchesWon: number;
  adminLeaderboardEligible?: boolean;
}

type PublicProfileHighlightRank = Pick<PublicProfileRank, 'eloPoints' | 'tierName' | 'categoryName'> & {
  matchesPlayed?: number;
  adminLeaderboardEligible?: boolean;
};

export interface PopoverUserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  role?: "OWNER" | "MODERATOR" | "MEMBER" | string;
  systemRole?: string;
  roles?: string[];
  tags?: string[];
  streak?: MemberStreak | null;
  bio?: string | null;
  joinedAt?: string | null;
  isVerified?: boolean;
  allowStrangerMessages?: boolean;
  ranks?: PublicProfileRank[];
  highlightRank?: PublicProfileHighlightRank | null;
}

interface UserProfilePopoverProps {
  user: PopoverUserProfile | null;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  communityId?: string;
  onTagsUpdated?: (userId: string, tags: string[]) => void;
}

export default function UserProfilePopover({
  user,
  anchorRect,
  isOpen,
  onClose,
  communityId,
  onTagsUpdated,
}: UserProfilePopoverProps) {
  const translate = useTranslations('Common');
  const locale = useLocale();
  const getPresetLabel = (name: string) => getCommunityTagDisplayName(name, translate);
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [fetchedDetails, setFetchedDetails] = useState<Partial<PopoverUserProfile> | null>(null);
  const [tagPresets, setTagPresets] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [directMessagePolicy, setDirectMessagePolicy] = useState<{ canMessage: boolean; reasonCode: string | null } | null>(null);

  useEffect(() => {
    if (!isOpen || !user?.id || !currentUser?.id || currentUser.id === user.id) {
      setDirectMessagePolicy(null);
      return;
    }

    let isMounted = true;
    setDirectMessagePolicy(null);
    chatApi
      .getDirectMessagePolicy(user.id)
      .then((policy) => {
        if (isMounted) setDirectMessagePolicy(policy);
      })
      .catch(() => {
        // Fail closed: do not expose a CTA that will immediately fail with 403/500.
        if (isMounted) setDirectMessagePolicy({ canMessage: false, reasonCode: 'POLICY_CHECK_FAILED' });
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id, currentUser?.id]);

  // Inline Tag Editing State
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Derive profileData by merging initial user prop with any fetched details
  const profileData = user
    ? {
        ...user,
        ...(fetchedDetails?.id === user.id ? fetchedDetails : {}),
      }
    : null;
  const displayName = profileData?.fullName || translate('memberFallback');

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
          allowStrangerMessages: publicData.allowStrangerMessages ?? prev?.allowStrangerMessages ?? user.allowStrangerMessages,
          ranks: Array.isArray(publicData.ranks) ? (publicData.ranks as unknown as PublicProfileRank[]) : prev?.ranks,
          highlightRank: (publicData.highlightRank as PopoverUserProfile['highlightRank']) ?? prev?.highlightRank ?? user.highlightRank,
          joinedAt: publicData.createdAt || prev?.joinedAt || user.joinedAt,
        }));
      })
      .catch(() => {
        // Privacy is fail-closed when the public profile cannot be loaded.
      });

    // 2. Fetch community member role, streak, and tags if inside a community
    if (communityId) {
      communitiesApi
        .getTagPresets(communityId)
        .then((res) => {
          if (!isMounted) return;
          const presets = res.data ?? [];
          setTagPresets(Array.isArray(presets) ? presets : []);
        })
        .catch(() => {});

      communitiesApi
        .getMembers(communityId, { limit: 100 })
        .then((res) => {
          if (!isMounted) return;
          type RawMemberItem = Partial<CommunityMemberRecord> & {
            userId?: string;
            role?: string;
            tags?: string[];
            joinedAt?: string;
          };

          const raw = res.data;
          const rawObj = raw as unknown as { data?: RawMemberItem[] };
          const members: RawMemberItem[] = Array.isArray(raw)
            ? (raw as RawMemberItem[])
            : Array.isArray(rawObj?.data)
            ? rawObj.data
            : [];

          // Find current viewed user's membership
          const found = members.find(
            (m: RawMemberItem) => m.user?.id === user.id || m.member?.userId === user.id || m.userId === user.id,
          );
          if (found) {
            setFetchedDetails((prev) => ({
              ...(prev?.id === user.id ? prev : {}),
              id: user.id,
              role: found.member?.role || found.role || prev?.role,
              tags: found.member?.tags || found.tags || prev?.tags,
              streak: found.streak || prev?.streak,
              joinedAt: found.member?.joinedAt || found.joinedAt || prev?.joinedAt,
            }));
          }

          // Check viewer's role in this community
          if (currentUser?.id) {
            const viewerMember = members.find(
              (m: RawMemberItem) => m.user?.id === currentUser.id || m.member?.userId === currentUser.id || m.userId === currentUser.id,
            );
            if (viewerMember) {
              setViewerRole(viewerMember.member?.role || viewerMember.role || null);
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id, user?.bio, user?.avatarUrl, user?.fullName, user?.coverUrl, user?.isVerified, user?.allowStrangerMessages, user?.highlightRank, user?.joinedAt, communityId, currentUser?.id]);

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

  // Calculate Popover Position
  const popoverWidth = 340;
  const popoverHeight = isEditingTags ? 380 : 310;
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

  // Permissions to manage tags in this community
  const isOwner = viewerRole === "OWNER" || currentUser?.roles?.includes("ADMIN") === true;
  const isModerator = viewerRole === "MODERATOR";
  const canManageTags = Boolean(communityId && (isOwner || isModerator));

  // Community Role
  const communityRoleLabel = communityId
    ? profileData.role === "OWNER"
      ? translate('communityOwner')
      : profileData.role === "MODERATOR"
        ? translate('communityModerator')
        : translate('communityMember')
    : null;

  // System Role helper
  const getSystemRoleBadge = (role?: string) => {
    if (!role) return null;
    switch (role) {
      case "ADMIN":
        return { label: translate('systemAdminRole'), color: "bg-purple-600 text-white font-bold shadow-2xs" };
      case "ORGANIZER":
        return { label: translate('organizerRole'), color: "bg-indigo-600 text-white font-bold shadow-2xs" };
      case "REFEREE":
        return { label: translate('refereeRole'), color: "bg-amber-600 text-white font-bold shadow-2xs" };
      case "PLAYER":
      default:
        return { label: translate('athleteRole'), color: "bg-blue-600 text-white font-bold shadow-2xs" };
    }
  };

  const sysRoleBadge = getSystemRoleBadge(profileData.systemRole);
  const eligibleRanks = (profileData.ranks ?? []).filter(isPublicRankingEligible);
  const eligibleHighlightRank = profileData.highlightRank && typeof profileData.highlightRank.matchesPlayed === 'number'
    ? isPublicRankingEligible({
        matchesPlayed: profileData.highlightRank.matchesPlayed,
        adminLeaderboardEligible: profileData.highlightRank.adminLeaderboardEligible,
      })
      ? profileData.highlightRank
      : null
    : null;
  const primaryRank = eligibleHighlightRank ?? eligibleRanks[0] ?? null;
  const isSelf = Boolean(currentUser?.id && profileData?.id && currentUser.id === profileData.id);
  const canMessage = !isSelf && directMessagePolicy?.canMessage === true;
  const profileRanks = eligibleRanks.slice(0, 3);
  const totalMatches = profileRanks.reduce((sum, rank) => sum + rank.matchesPlayed, 0);
  const totalWins = profileRanks.reduce((sum, rank) => sum + rank.matchesWon, 0);

  // Start tag editing mode
  const handleStartEditTags = () => {
    setSelectedTags(profileData?.tags ? [...profileData.tags] : []);
    setIsEditingTags(true);
  };

  // Toggle tag selection
  const handleToggleTag = (tag: string) => {
    const isSelected = selectedTags.some((selected) => selected.toLowerCase() === tag.toLowerCase());
    if (isSelected) {
      setSelectedTags((prev) => prev.filter((selected) => selected.toLowerCase() !== tag.toLowerCase()));
      return;
    }

    if (selectedTags.length >= MAX_MEMBER_TAGS) {
      toast.error(translate('tagMaxCountError', { count: MAX_MEMBER_TAGS }));
      return;
    }
    if (tag.length > MAX_MEMBER_TAG_LENGTH) {
      toast.error(translate('tagMaxLengthError', { count: MAX_MEMBER_TAG_LENGTH }));
      return;
    }
    if (!MEMBER_TAG_PATTERN.test(tag)) {
      toast.error(translate('tagInvalidCharactersError'));
      return;
    }

    setSelectedTags((prev) => [...prev, tag]);
  };

  // Add custom tag
  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (selectedTags.length >= MAX_MEMBER_TAGS) {
      toast.error(translate('tagMaxCountError', { count: MAX_MEMBER_TAGS }));
      return;
    }
    if (trimmed.length > MAX_MEMBER_TAG_LENGTH) {
      toast.error(translate('tagMaxLengthError', { count: MAX_MEMBER_TAG_LENGTH }));
      return;
    }
    if (!MEMBER_TAG_PATTERN.test(trimmed)) {
      toast.error(translate('tagInvalidCharactersError'));
      return;
    }
    if (selectedTags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(translate('tagExistsError'));
      return;
    }

    setSelectedTags((prev) => [...prev, trimmed]);
    setCustomTagInput("");
  };

  // Save tags
  const handleSaveTags = async () => {
    if (!communityId || !profileData?.id || isSavingTags) return;
    const profileId = profileData.id;
    setIsSavingTags(true);
    try {
      await communitiesApi.updateMemberTags(communityId, profileId, selectedTags);
      setFetchedDetails((prev) => ({
          ...(prev?.id === profileId ? prev : {}),
          id: profileId,
        tags: selectedTags,
      }));
      onTagsUpdated?.(profileId, selectedTags);
      setIsEditingTags(false);
      toast.success(translate('tagsUpdatedSuccess'));
      window.dispatchEvent(
        new CustomEvent('sporto:member-tags-updated', {
          detail: { communityId, userId: profileId, tags: selectedTags },
        }),
      );
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
      const msg = Array.isArray(errorData?.message) ? errorData.message[0] : errorData?.message;
      toast.error(msg || translate('tagsUpdateFailed'));
    } finally {
      setIsSavingTags(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      style={{
        top: `${top}px`,
        left: `${left}px`,
        position: "absolute",
      }}
      className="z-[99999] w-[340px] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 rounded-2xl border border-slate-200/90 bg-white shadow-2xl text-slate-800"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cover Header */}
      <div className="relative h-20 bg-slate-900 overflow-hidden">
        {profileData.coverUrl && (
          <img
            src={profileData.coverUrl}
            alt={translate('cover')}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/15" />
        <button
          type="button"
          onClick={onClose}
          aria-label={translate('close')}
          className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Profile Body */}
      <div className="relative px-4 pb-4 pt-0">
        {/* Avatar positioned over header */}
        <div className="-mt-10 mb-2 flex items-end justify-between">
          <div className="rounded-full shadow-md">
            <RankAvatar
              src={profileData.avatarUrl}
              name={displayName}
              size="lg"
              className="h-[60px] w-[60px]"
              elo={primaryRank?.eloPoints}
              tierName={primaryRank?.tierName}
              categoryName={primaryRank?.categoryName}
              matchesPlayed={primaryRank?.matchesPlayed ?? 0}
              ringClassName="ring-2"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {/* Community Role Badge */}
            {communityRoleLabel && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-xs border ${
                  profileData.role === "OWNER"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : profileData.role === "MODERATOR"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {communityRoleLabel}
              </span>
            )}

            {/* System Role Badge */}
            {sysRoleBadge && !communityRoleLabel && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-xs border ${sysRoleBadge.color}`}
              >
                {sysRoleBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Name, Verified Badge & Sub info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-base font-bold text-slate-900">
              {displayName}
            </h4>
            {profileData.isVerified && (
              <span title={translate('verifiedAccount')} className="inline-flex items-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2 mt-0.5">
            <p className="text-xs text-slate-500">
              {profileData.joinedAt
                ? translate('joinedSince', { date: new Date(profileData.joinedAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US') })
                : translate('member')}
            </p>

            {/* ELO Tier Badge if present */}
            {eligibleHighlightRank && (
              <EloTierBadge
                elo={eligibleHighlightRank.eloPoints}
                tierName={eligibleHighlightRank.tierName || undefined}
                categoryName={eligibleHighlightRank.categoryName || undefined}
                size="sm"
              />
            )}

            {/* Streak Badge if available */}
            {profileData.streak?.type && profileData.streak.count > 0 && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${
                  profileData.streak.type === "WIN"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : profileData.streak.type === "LOSS"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {profileData.streak.label ||
                  (profileData.streak.type === "ELO_UP"
                    ? `+${profileData.streak.count} ELO`
                    : translate(profileData.streak.type === "WIN" ? 'winStreak' : 'lossStreak', { count: profileData.streak.count }))}
              </span>
            )}
          </div>
        </div>

        {/* Bio if available */}
        {profileData.bio && (
          <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
            {profileData.bio}
          </p>
        )}

        {/* Rank & ELO Section */}
        {profileRanks.length > 0 ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2">
              {profileRanks.map((rank) => (
                <div key={`${rank.categoryName}-${rank.matchType}`} className="min-w-0 text-center">
                  <div className="truncate text-[9px] font-semibold uppercase text-slate-400">{rank.categoryName || 'ELO'}</div>
                  <div className="text-xs font-bold text-slate-800">{rank.eloPoints}</div>
                  {rank.matchesPlayed > 0 && (
                    <div className="text-[9px] text-slate-500">{rank.matchesWon}/{rank.matchesPlayed} {translate('winsShort')}</div>
                  )}
                </div>
              ))}
            </div>
            {totalMatches > 0 && (
              <p className="mt-1 text-center text-[10px] text-slate-500">
                {translate('matchSummary', { matches: totalMatches, wins: totalWins, losses: Math.max(0, totalMatches - totalWins) })}
              </p>
            )}
          </>
        ) : (
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="font-semibold text-slate-700">{translate('currentElo')}</span>
            </div>
            <span className="font-extrabold text-blue-600">
              {new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(primaryRank?.eloPoints ?? 1000)} ELO
            </span>
          </div>
        )}

        {/* Compact club tags and tag management */}
        {communityId && (
          <div className="mt-3">
            <div className="flex items-center flex-wrap gap-1.5">
              {(profileData.tags ?? []).map((tag) => {
                const preset = tagPresets.find(
                  (p) => p.name.toLowerCase() === tag.toLowerCase(),
                );
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border shadow-2xs"
                    style={
                      preset
                        ? {
                            backgroundColor: preset.color,
                            borderColor: `${preset.color}99`,
                            color: '#0f172a',
                          }
                        : {
                            backgroundColor: '#f1f5f9',
                            borderColor: '#cbd5e1',
                            color: '#1e293b',
                          }
                    }
                  >
                    <Tag className="h-3 w-3 opacity-60" strokeWidth={1.8} />
                    {getPresetLabel(tag)}
                  </span>
                );
              })}

              {canManageTags && !isEditingTags && (
                <button
                  type="button"
                  onClick={handleStartEditTags}
                  aria-label={translate('assignTags')}
                  title={translate('assignTags')}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-blue-300 bg-blue-50 text-blue-700 transition hover:bg-blue-100 hover:border-blue-400"
                >
                  <Tag className="h-3 w-3" strokeWidth={1.8} />
                  <Plus className="-ml-1 h-2.5 w-2.5" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {!isEditingTags ? null : (
              /* Inline Edit Mode */
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-2 animate-in fade-in duration-150">
                <p className="text-[10px] font-semibold text-slate-500">
                  {translate('chooseTagToAssign')}
                </p>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {tagPresets.map((preset) => {
                    const isSelected = selectedTags.includes(preset.name);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleToggleTag(preset.name)}
                        disabled={isSavingTags || (selectedTags.length >= MAX_MEMBER_TAGS && !isSelected)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-blue-500 shadow-xs"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor: preset.color,
                          borderColor: `${preset.color}99`,
                          color: "#0f172a",
                        }}
                      >
                        {isSelected && <Check className="h-3 w-3 text-slate-900 shrink-0" />}
                        <span>{getPresetLabel(preset.name)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tag Input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    maxLength={MAX_MEMBER_TAG_LENGTH}
                    disabled={isSavingTags || selectedTags.length >= MAX_MEMBER_TAGS}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder={translate('customTagPlaceholder')}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder-slate-400 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    disabled={isSavingTags || selectedTags.length >= MAX_MEMBER_TAGS || !customTagInput.trim()}
                    className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                  >
                    + {translate('addTag')}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSavingTags}
                    onClick={() => {
                      setIsEditingTags(false);
                      if (profileData.tags) setSelectedTags(profileData.tags);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    {translate('cancelTagEdit')}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingTags}
                    onClick={handleSaveTags}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingTags && <Loader2 className="h-3 w-3 animate-spin" />}
                    <span>{translate('saveTags')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="mt-3.5 flex gap-2 pt-2.5 border-t border-slate-100">
          {!isSelf && canMessage && (
            <button
              type="button"
              disabled={isOpeningChat || !canMessage}
              onClick={async () => {
                if (!profileData.id || isOpeningChat) return;
                if (!canMessage) {
                  toast.error(translate('strangerMessagesDisabled'));
                  return;
                }
                setIsOpeningChat(true);
                try {

                  window.dispatchEvent(
                    new CustomEvent('sporto:open-direct-chat', {
                      detail: { userId: profileData.id },
                    }),
                  );
                  setIsOpeningChat(false);
                  onClose();
                } catch {
                  setIsOpeningChat(false);
                }
              }}
              title={!canMessage ? translate('strangerMessagesDisabled') : undefined}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {isOpeningChat ? translate('chatOpening') : canMessage ? translate('message') : translate('strangerMessagesShort')}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              if (profileData.id) {
                router.push(`/users/${profileData.id}`);
              }
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-98 border border-slate-200/80"
          >
            <User className="h-3.5 w-3.5" />
            {translate('profile')}
          </button>
        </div>
      </div>
    </div>
  );
}
