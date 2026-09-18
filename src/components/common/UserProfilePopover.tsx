"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from 'next-intl';
import { X, MessageCircle, User, CheckCircle2, Tag, Plus, Check, Loader2, UserPlus, UserCheck, UserRoundX } from "lucide-react";
import { UserProfileSkeleton } from "@/components/skeletons/UserProfileSkeleton";
import { usersApi } from "@/features/users/api";
import { chatApi } from "@/features/chat/api";
import { communitiesApi, MemberStreak, CommunityMemberRecord } from "@/features/communities/api";
import { useRouter } from "next/navigation";
import { EloTierBadge } from "@/components/ui/EloTierBadge";
import { RankAvatar } from "@/components/ui/RankAvatar";
import { useAuthStore } from "@/lib/zustand/authStore";
import { getCommunityTagDisplayName } from '@/app/(public)/communities/[id]/components/tag-display';
import { isPublicRankingEligible } from '@/features/rankings/elo-display';
import { rankingsApi, PlayerRanking } from "@/features/rankings/api";
import { matchesApi } from "@/features/matches/api";
import { socialApi, type FriendshipStatusResponse } from "@/features/social/api";
import { Trophy, Flame } from "lucide-react";
import toast from "react-hot-toast";
import { useUserProfileModalStore } from "@/lib/zustand/userProfileModalStore";

const MAX_MEMBER_TAGS = 3;
const MAX_MEMBER_TAG_LENGTH = 15;
const MEMBER_TAG_PATTERN = /^[\p{L}\p{N} _-]+$/u;

interface PublicProfileRank {
  categoryId?: string;
  categoryName?: string | null;
  matchType?: string | null;
  genderRestriction?: string | null;
  eloPoints: number;
  tierName?: string | null;
  matchesPlayed: number;
  matchesWon: number;
  adminLeaderboardEligible?: boolean;
  partnerId?: string | null;
  partnerName?: string | null;
  partnerAvatarUrl?: string | null;
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
  const { keepOpen, scheduleClose } = useUserProfileModalStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isUnfriendHovered, setIsUnfriendHovered] = useState(false);
  const [fetchedDetails, setFetchedDetails] = useState<Partial<PopoverUserProfile> | null>(null);
  const [tagPresets, setTagPresets] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [directMessagePolicy, setDirectMessagePolicy] = useState<{ canMessage: boolean; reasonCode: string | null } | null>(null);
  const [friendship, setFriendship] = useState<FriendshipStatusResponse | null>(null);
  const [friendshipContextKey, setFriendshipContextKey] = useState<string | null>(null);
  const [friendshipAction, setFriendshipAction] = useState<'send' | 'accept' | 'reject' | 'remove' | null>(null);

  useEffect(() => {
    if (!isOpen || !user?.id || !currentUser?.id || currentUser.id === user.id) {
      return;
    }

    let isMounted = true;
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
      setDirectMessagePolicy(null);
    };
  }, [isOpen, user?.id, currentUser?.id]);

  useEffect(() => {
    if (!isOpen || !user?.id || !currentUser?.id || currentUser.id === user.id) {
      return;
    }

    let isMounted = true;
    const requestContextKey = `${currentUser.id}:${user.id}`;

    socialApi
      .getFriendshipStatus(user.id)
      .then((status) => {
        if (isMounted) {
          setFriendshipContextKey(requestContextKey);
          setFriendship(status);
        }
      })
      .catch(() => {
        // Fail closed: an unavailable status must not expose an unsafe action.
        if (isMounted) {
          setFriendshipContextKey(requestContextKey);
          setFriendship(null);
        }
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

  const [userClubRank, setUserClubRank] = useState<PlayerRanking | null>(null);
  const [clubMatchesStats, setClubMatchesStats] = useState<{ total: number; wins: number } | null>(null);
  const [clubCategory, setClubCategory] = useState<string | null>(null);

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
          ranks: [
            ...(Array.isArray(publicData.ranks) ? (publicData.ranks as unknown as PublicProfileRank[]) : []),
            ...(Array.isArray(publicData.pairRanks) ? (publicData.pairRanks as unknown as PublicProfileRank[]) : []),
          ],
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
        .getCommunityById(communityId)
        .then((res) => {
          if (!isMounted) return;
          const comm = res.data;
          const catName = comm?.categories?.[0]?.name || null;
          if (catName) setClubCategory(catName);
        })
        .catch(() => {});

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

      // Fetch user's club rankings (internal ELO in this club)
      rankingsApi
        .getUserRankings(user.id)
        .then((res) => {
          if (!isMounted) return;
          const communityRank = res.communityRanks?.find((r) => r.communityId === communityId);
          setUserClubRank(communityRank || null);
        })
        .catch(() => {
          if (isMounted) setUserClubRank(null);
        });

      // Fetch tournament matches in this community to count player's club matches
      communitiesApi
        .getTournaments(communityId)
        .then(async (tourRes) => {
          if (!isMounted) return;
          const tours = Array.isArray(tourRes?.data) ? tourRes.data.slice(0, 5) : [];
          if (tours.length === 0) return;

          const matchPromises = tours.map((t) =>
            matchesApi.getMatches({ tournament_id: t.id, limit: 50 }).catch(() => ({ data: [] }))
          );
          const matchResults = await Promise.all(matchPromises);
          if (!isMounted) return;

          const allMatches = matchResults.flatMap((r) => (Array.isArray(r?.data) ? r.data : []));
          const targetName = (user.fullName || '').toLowerCase().trim();
          const userMatches = allMatches.filter((m) => {
            const p1Id = m.participant1Id || m.participant1?.id;
            const p2Id = m.participant2Id || m.participant2?.id;
            const isDirect = p1Id === user.id || p2Id === user.id;
            const inMembers = (m.participant1?.members || []).some((mem) => mem.userId === user.id || (targetName && (mem.fullName || '').toLowerCase().includes(targetName)))
              || (m.participant2?.members || []).some((mem) => mem.userId === user.id || (targetName && (mem.fullName || '').toLowerCase().includes(targetName)));
            const inTeam = Boolean(targetName && ((m.participant1?.teamName || '').toLowerCase().includes(targetName) || (m.participant2?.teamName || '').toLowerCase().includes(targetName)));
            return isDirect || inMembers || inTeam;
          });
          const wins = userMatches.filter((m) => {
            if (m.status !== 'COMPLETED') return false;
            const p1Id = m.participant1Id || m.participant1?.id;
            const isP1 = p1Id === user.id || (m.participant1?.members || []).some((mem) => mem.userId === user.id || (targetName && (mem.fullName || '').toLowerCase().includes(targetName)))
              || (targetName && (m.participant1?.teamName || '').toLowerCase().includes(targetName));
            return (isP1 && m.winnerId === p1Id) || (!isP1 && m.winnerId === (m.participant2Id || m.participant2?.id));
          }).length;
          setClubMatchesStats({ total: userMatches.length, wins });
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id, user?.bio, user?.avatarUrl, user?.fullName, user?.coverUrl, user?.isVerified, user?.allowStrangerMessages, user?.highlightRank, user?.joinedAt, communityId, currentUser?.id]);

  // Click outside, Esc key, and scroll handlers
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

    const handleScroll = (event: Event) => {
      // If user scrolls the outer page/window, immediately dismiss the hover popover
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !profileData || !anchorRect) return null;

  // True while getPublicProfile() hasn't resolved for the current user yet
  const isLoadingDetails = !fetchedDetails || fetchedDetails.id !== user?.id;

  // Calculate Popover Position using fixed viewport coordinates
  const popoverWidth = 340;
  const popoverHeight = isEditingTags ? 380 : 340;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Horizontal placement:
  // If the trigger card is very wide (e.g. w-full sidebar card), anchor popover near the avatar (left edge of anchorRect + 12)
  // or center it relative to trigger if small.
  let left = anchorRect.left;
  if (left + popoverWidth > viewportWidth - 16) {
    left = viewportWidth - popoverWidth - 16;
  }
  if (left < 16) {
    left = 16;
  }

  // Vertical placement:
  // Calculate available spaces below and above
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;

  let top = anchorRect.bottom + 8;
  // If not enough room below (< popoverHeight + 16), AND there's more room above than below:
  if (spaceBelow < popoverHeight + 16 && spaceAbove > spaceBelow) {
    top = Math.max(16, anchorRect.top - popoverHeight - 8);
  } else if (top + popoverHeight > viewportHeight - 16) {
    // If placed below but still hits screen bottom, clamp within viewport
    top = Math.max(16, viewportHeight - popoverHeight - 16);
  }
  if (top < 16) {
    top = 16;
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
  const getRankTypeLabel = (rank: PublicProfileRank) => {
    const matchType = rank.matchType;
    const gender = (rank.genderRestriction || '').trim().toUpperCase();
    if (matchType === 'MIXED_DOUBLES' || (matchType === 'DOUBLES' && gender === 'MIXED')) {
      return translate('communityMixedDoubles');
    }
    if (matchType === 'SINGLES') {
      if (gender === 'MALE' || gender === 'NAM') return translate('communitySinglesMale');
      if (gender === 'FEMALE' || gender === 'NU' || gender === 'NỮ') return translate('communitySinglesFemale');
      return translate('communitySingles');
    }
    if (matchType === 'DOUBLES') {
      if (gender === 'MALE' || gender === 'NAM') return translate('communityDoublesMale');
      if (gender === 'FEMALE' || gender === 'NU' || gender === 'NỮ') return translate('communityDoublesFemale');
      return translate('communityDoubles');
    }
    return '';
  };

  const deduplicatedRanks = (profileData.ranks ?? [])
    .filter(isPublicRankingEligible)
    .filter((rank, idx, arr) => {
      // Remove duplicates having same category and matchType without gender when a specific gender version exists
      const betterExists = arr.some(
        (other) =>
          other.categoryId === rank.categoryId &&
          other.matchType === rank.matchType &&
          Boolean(other.genderRestriction) &&
          !rank.genderRestriction,
      );
      return !betterExists;
    });

  const eligibleRanks = deduplicatedRanks;
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
  const friendshipRequestContextKey = currentUser?.id && profileData?.id
    ? `${currentUser.id}:${profileData.id}`
    : null;
  const isFriendshipLoading = Boolean(
    !isSelf && friendshipRequestContextKey && friendshipContextKey !== friendshipRequestContextKey,
  );
  const profileRanks = eligibleRanks.slice(0, 3);
  const totalMatches = profileRanks.reduce((sum, rank) => sum + rank.matchesPlayed, 0);
  const totalWins = profileRanks.reduce((sum, rank) => sum + rank.matchesWon, 0);

  // Start tag editing mode
  const handleStartEditTags = () => {
    setSelectedTags(profileData?.tags ? [...profileData.tags] : []);
    setIsEditingTags(true);
  };

  const handleFriendshipAction = async (
    action: 'send' | 'accept' | 'reject' | 'remove',
  ) => {
    if (!profileData?.id || !currentUser?.id || friendshipAction) return;

    if (action === 'remove') {
      const message = friendship?.status === 'ACCEPTED'
        ? translate('friendConfirmUnfriend')
        : translate('friendConfirmCancel');
      if (!window.confirm(message)) return;
    }

    setFriendshipAction(action);
    try {
      const nextStatus = action === 'send'
        ? await socialApi.sendFriendRequest(profileData.id)
        : action === 'accept'
          ? await socialApi.respondToFriendRequest(friendship?.id ?? '', 'ACCEPTED')
          : action === 'reject'
            ? await socialApi.respondToFriendRequest(friendship?.id ?? '', 'REJECTED')
            : await socialApi.removeFriendship(friendship?.id ?? '');

      setFriendship(nextStatus);
      const successKey = action === 'send'
        ? 'friendSendSuccess'
        : action === 'accept'
          ? 'friendAcceptSuccess'
          : action === 'reject'
            ? 'friendRejectSuccess'
            : friendship?.status === 'ACCEPTED'
              ? 'friendUnfriendSuccess'
              : 'friendCancelSuccess';
      toast.success(translate(successKey));
    } catch {
      toast.error(translate('friendActionFailed'));
    } finally {
      setFriendshipAction(null);
    }
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

    // If this tag is not in tagPresets, also persist it as a club tag preset so it can be reused
    if (communityId && !tagPresets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      communitiesApi
        .createTagPreset(communityId, { name: trimmed, color: "#cbd5e1" })
        .then((res) => {
          if (res.data) {
            setTagPresets((prev) => [...prev, res.data!]);
          }
        })
        .catch(() => {
          // Preset creation failure is non-blocking for member tag assignment
        });
    }
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

  // While getPublicProfile() is in-flight, render the positioned shell with a skeleton
  // so the popover appears instantly at the right position without layout shift.
  if (isLoadingDetails) {
    return (
      <div
        ref={popoverRef}
        style={{ top: `${top}px`, left: `${left}px`, position: "fixed" }}
        className="z-[99999] w-[340px] animate-in fade-in zoom-in-95 duration-150 rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={keepOpen}
        onMouseLeave={() => scheduleClose(1500)}
      >
        {/* Close button stays accessible during loading */}
        <button
          type="button"
          onClick={onClose}
          aria-label={translate('close')}
          className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
        <UserProfileSkeleton />
      </div>
    );
  }

  return (
    <div
      ref={popoverRef}
      style={{
        top: `${top}px`,
        left: `${left}px`,
        position: "fixed",
      }}
      className="z-[99999] w-[340px] max-h-[90vh] overflow-hidden overflow-y-auto animate-in fade-in zoom-in-95 duration-150 rounded-2xl border border-slate-200/90 bg-white shadow-2xl text-slate-800"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={keepOpen}
      onMouseLeave={() => scheduleClose(1500)}
    >
      {/* Cover Header */}
      <div className="relative h-24 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
        {profileData.coverUrl && (
          <img
            src={profileData.coverUrl}
            alt={translate('cover')}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
        <button
          type="button"
          onClick={onClose}
          aria-label={translate('close')}
          className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Profile Body */}
      <div className="relative px-4 pb-4 pt-0">
        {/* Avatar positioned over header cleanly with official RankAvatar ring and shadow */}
        <div className="-mt-12 mb-3 flex items-end justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (profileData.id) router.push(`/users/${profileData.id}`);
            }}
            className="cursor-pointer transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
            title={translate('viewProfile')}
          >
            <RankAvatar
              src={profileData.avatarUrl}
              name={displayName}
              size="lg"
              className="h-16 w-16"
              elo={
                communityId
                  ? ((userClubRank?.matchesPlayed ?? 0) > 0 || (clubMatchesStats?.total ?? 0) > 0)
                    ? (userClubRank?.eloPoints ?? null)
                    : null
                  : primaryRank?.eloPoints
              }
              tierName={
                communityId
                  ? ((userClubRank?.matchesPlayed ?? 0) > 0 || (clubMatchesStats?.total ?? 0) > 0)
                    ? (userClubRank?.tierName ?? userClubRank?.tier?.name ?? null)
                    : null
                  : primaryRank?.tierName
              }
              categoryName={communityId ? (userClubRank?.categoryName || clubCategory || null) : primaryRank?.categoryName}
              matchesPlayed={communityId ? (userClubRank?.matchesPlayed ?? clubMatchesStats?.total ?? 0) : primaryRank?.matchesPlayed}
              ringClassName="ring-4 ring-white shadow-md"
            />
          </button>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {/* Community Role Badge */}
            {communityRoleLabel && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs border ${
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
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs border ${sysRoleBadge.color}`}
              >
                {sysRoleBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Name, Verified Badge & Sub info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (profileData.id) router.push(`/users/${profileData.id}`);
              }}
              className="group flex items-center gap-1.5 text-left truncate cursor-pointer focus-visible:outline-none"
              title={translate('viewProfile')}
            >
              <h4 className="truncate text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {displayName}
              </h4>
            </button>
            {profileData.isVerified && (
              <span title={translate('verifiedAccount')} className="inline-flex items-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            {profileData.joinedAt
              ? translate('joinedSince', { date: new Date(profileData.joinedAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US') })
              : translate('member')}
          </p>

          {/* 🏆 Club Specific Standing HUD (When in Club Context) */}
          {communityId && (() => {
            const matchesPlayedCount = userClubRank?.matchesPlayed ?? clubMatchesStats?.total ?? 0;
            const matchesWonCount = userClubRank?.matchesWon ?? clubMatchesStats?.wins ?? 0;
            const isRankedInClub = Boolean(userClubRank?.eloPoints && matchesPlayedCount > 0);
            const sportCategory = userClubRank?.categoryName || clubCategory || undefined;

            return (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isRankedInClub ? (
                      <>
                        <EloTierBadge
                          elo={userClubRank!.eloPoints}
                          tierName={userClubRank?.tierName || userClubRank?.tier?.name}
                          categoryName={sportCategory}
                          size="sm"
                        />
                        <span className="text-xs font-black font-mono text-slate-800">
                          {userClubRank!.eloPoints} ELO
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-300/60">
                        Chưa xếp hạng
                      </span>
                    )}
                  </div>

                  {/* Streak Badge (only when player has streak & has played) */}
                  {matchesPlayedCount > 0 && (
                    profileData.streak?.count && profileData.streak.count > 0 ? (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          profileData.streak.type === "WIN"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        <Flame className="w-2.5 h-2.5" />
                        {profileData.streak.type === "WIN"
                          ? `W${profileData.streak.count}`
                          : `L${profileData.streak.count}`}
                      </span>
                    ) : userClubRank?.winStreak && userClubRank.winStreak > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Flame className="w-2.5 h-2.5" />
                        W{userClubRank.winStreak}
                      </span>
                    ) : null
                  )}
                </div>

                {/* Clean 2-Column Telemetry: Trận thắng & Tỷ lệ thắng (Bỏ bộ môn vì trong CLB đã rõ) */}
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-2 border border-slate-100 text-center">
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-semibold uppercase text-slate-400">Trận thắng</div>
                    <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                      {matchesWonCount}/{matchesPlayedCount}
                    </div>
                  </div>
                  <div className="min-w-0 border-l border-slate-100">
                    <div className="truncate text-[10px] font-semibold uppercase text-slate-400">Tỷ lệ thắng</div>
                    <div className="text-xs font-bold text-emerald-600 font-mono mt-0.5">
                      {matchesPlayedCount > 0 ? `${Math.round((matchesWonCount / matchesPlayedCount) * 100)}%` : '0%'}
                    </div>
                  </div>
                </div>

                {/* Action: View club member matches */}
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('sporto:view-club-member-matches', {
                        detail: { communityId, query: displayName },
                      }),
                    );
                    window.dispatchEvent(
                      new CustomEvent('sporto:filter-club-matches', {
                        detail: { query: displayName },
                      }),
                    );
                    onClose();
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition active:scale-98"
                >
                  <Trophy className="w-3 h-3 text-blue-500" />
                  <span>Xem các trận trong CLB</span>
                </button>
              </div>
            );
          })()}

          {/* ELO Tier Badges for each sport with Smart Overflow (World/Public Rank) - ONLY when NOT in club */}
          {!communityId && (
            <div className="mt-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Hạng hệ thống toàn cầu
              </p>
              {(() => {
                const eligible = eligibleRanks.length > 0
                  ? eligibleRanks
                  : (profileData.ranks || []).filter((r) => (r.eloPoints || 0) > 0);

                const seenCategories = new Set<string>();
                const distinctRanks = eligible.filter((r) => {
                  const cat = (r.categoryName || '').toLowerCase();
                  if (seenCategories.has(cat)) return false;
                  seenCategories.add(cat);
                  return true;
                });

                if (distinctRanks.length === 0 && !eligibleHighlightRank) {
                  return (
                    <p className="text-[11px] text-slate-400 italic">Chưa tham gia xếp hạng toàn quốc</p>
                  );
                }

                const maxVisible = 3;
                const visibleRanks = distinctRanks.slice(0, maxVisible);
                const hiddenRanks = distinctRanks.slice(maxVisible);
                const remainingCount = hiddenRanks.length;
                const hiddenTooltip = `${hiddenRanks.map(r => `${r.categoryName}: ${r.eloPoints} ELO (${r.tierName || '--'})`).join('\n')}\n(Bấm để xem thêm trong hồ sơ)`;

                return (
                  <div className="flex items-center flex-wrap gap-1.5">
                    {visibleRanks.map((rank, idx) => (
                      <EloTierBadge
                        key={`${rank.categoryName || 'cat'}-${rank.matchType || idx}`}
                        elo={rank.eloPoints}
                        tierName={rank.tierName || undefined}
                        categoryName={rank.categoryName || undefined}
                        size="sm"
                      />
                    ))}

                    {remainingCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          if (profileData.id) {
                            router.push(`/users/${profileData.id}`);
                          }
                        }}
                        title={hiddenTooltip}
                        className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-colors active:scale-95"
                      >
                        +{remainingCount} xem thêm
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Bio if available */}
          {profileData.bio && (
            <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              {profileData.bio}
            </p>
          )}
        </div>

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
                    <Tag className="w-2.5 h-2.5 opacity-60" />
                    {tag}
                  </span>
                );
              })}
              {canManageTags && !isEditingTags && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTags(profileData.tags ?? []);
                    setIsEditingTags(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-blue-300 bg-blue-50/60 px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>{translate('tagMember')}</span>
                </button>
              )}
            </div>

            {/* Tag edit panel */}
            {canManageTags && isEditingTags && (
              <div className="mt-2.5 rounded-xl border border-blue-100 bg-blue-50/40 p-2.5 space-y-2">
                <div className="text-[11px] font-semibold text-slate-700">{translate('choosePresetTags')}</div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {tagPresets.map((preset) => {
                    const isSelected = selectedTags.includes(preset.name);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleToggleTag(preset.name)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition cursor-pointer border ${
                          isSelected
                            ? 'ring-2 ring-blue-500 font-bold shadow-xs'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: preset.color,
                          borderColor: `${preset.color}cc`,
                          color: '#0f172a',
                        }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                        {preset.name}
                      </button>
                    );
                  })}
                </div>

                {/* Custom tag input */}
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    placeholder={translate('customTagPlaceholder')}
                    maxLength={30}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    disabled={!customTagInput.trim()}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition cursor-pointer"
                  >
                    {translate('addTag')}
                  </button>
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex justify-end gap-1.5 pt-1 border-t border-blue-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTags(false);
                      setCustomTagInput('');
                    }}
                    disabled={isSavingTags}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40"
                  >
                    {translate('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTags}
                    disabled={isSavingTags}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSavingTags && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{translate('saveTags')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(() => {
          const showFriendship = !isSelf && !!currentUser?.id && (isFriendshipLoading || (friendshipContextKey === friendshipRequestContextKey && !!friendship));
          const showMessage = !isSelf && canMessage;

          const renderFriendshipButton = (isFullWidth: boolean = false) => {
            if (isFriendshipLoading) {
              return (
                <div className={`flex h-9 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-500 ${isFullWidth ? 'w-full' : 'flex-1'}`}>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {translate('friendLoading')}
                </div>
              );
            }

            if (friendship?.status === 'NONE') {
              return (
                <button
                  type="button"
                  onClick={() => handleFriendshipAction('send')}
                  disabled={friendshipAction !== null}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 ${isFullWidth ? 'w-full' : 'flex-1'}`}
                >
                  {friendshipAction === 'send' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {translate('friendAdd')}
                </button>
              );
            }

            if (friendship?.status === 'PENDING' && friendship.direction === 'OUTGOING') {
              return (
                <button
                  type="button"
                  onClick={() => handleFriendshipAction('remove')}
                  disabled={friendshipAction !== null}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 ${isFullWidth ? 'w-full' : 'flex-1'}`}
                >
                  {friendshipAction === 'remove' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserRoundX className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  {translate('friendCancel')}
                </button>
              );
            }

            if (friendship?.status === 'PENDING' && friendship.direction === 'INCOMING') {
              return (
                <div className={`flex gap-1.5 ${isFullWidth ? 'w-full' : 'flex-1 min-w-0'}`}>
                  <button
                    type="button"
                    onClick={() => handleFriendshipAction('accept')}
                    disabled={friendshipAction !== null}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 px-2 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 min-w-0 truncate"
                  >
                    {friendshipAction === 'accept' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{translate('friendAccept')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFriendshipAction('reject')}
                    disabled={friendshipAction !== null}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
                  >
                    {friendshipAction === 'reject' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {translate('friendReject')}
                  </button>
                </div>
              );
            }

            if (friendship?.status === 'ACCEPTED') {
              return (
                <button
                  type="button"
                  onClick={() => handleFriendshipAction('remove')}
                  onMouseEnter={() => setIsUnfriendHovered(true)}
                  onMouseLeave={() => setIsUnfriendHovered(false)}
                  disabled={friendshipAction !== null}
                  title={translate('friendConfirmUnfriend')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 min-w-0 ${
                    isUnfriendHovered
                      ? 'border border-rose-200 bg-rose-50 text-rose-600'
                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  } ${isFullWidth ? 'w-full' : 'flex-1'}`}
                >
                  {friendshipAction === 'remove' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : isUnfriendHovered ? (
                    <UserRoundX className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  )}
                  <span className="truncate">
                    {isUnfriendHovered ? translate('friendUnfriend') : translate('friendAccepted')}
                  </span>
                </button>
              );
            }

            return (
              <div className={`rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500 ${isFullWidth ? 'w-full' : 'flex-1'}`}>
                {translate('friendUnavailable')}
              </div>
            );
          };

          const renderMessageButton = (isFullWidth: boolean = false) => {
            if (!canMessage) return null;

            return (
              <button
                type="button"
                disabled={isOpeningChat}
                onClick={async () => {
                  if (!profileData.id || isOpeningChat) return;
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
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 min-w-0 ${
                  isFullWidth ? 'w-full' : 'flex-1'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{isOpeningChat ? translate('chatOpening') : translate('message')}</span>
              </button>
            );
          };

          if (isSelf) {
            return null;
          }

          if (showFriendship && showMessage) {
            return (
              <div className="mt-3 flex gap-2 items-center">
                {renderFriendshipButton(false)}
                {renderMessageButton(false)}
              </div>
            );
          }

          if (showFriendship) {
            return (
              <div className="mt-3">
                {renderFriendshipButton(true)}
              </div>
            );
          }

          if (showMessage) {
            return (
              <div className="mt-3">
                {renderMessageButton(true)}
              </div>
            );
          }

          return null;
        })()}
      </div>
    </div>
  );
}
