"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Flag, Heart, Loader2, MessageCircle, Maximize2, Trash2, Trophy, Calendar, ArrowUpRight } from "lucide-react";
import toast from "react-hot-toast";
import { communitiesApi } from "@/features/communities/api";
import type {
  CommunityComment,
  CommunityPost,
  CommunityReactionType,
} from "@/types/community-social";
import { cn } from "@/utils/cn";
import { getErrorMessage } from "@/utils/error";
import { formatRelativeTime } from "@/utils/format";
import CommunityAvatar from "./CommunityAvatar";
import CommunityPollCard from "./CommunityPollCard";
import CommunityTournamentBracketWidget from "./CommunityTournamentBracketWidget";
import ImageLightboxModal from "@/components/common/ImageLightboxModal";
import UserProfilePopover, {
  type PopoverUserProfile,
} from "@/components/common/UserProfilePopover";
import { useAuthStore } from "@/lib/zustand/authStore";
import { getCommunityTagDisplayName, isSameCommunityTag } from './tag-display';

interface CommunityPostCardProps {
  post: CommunityPost;
  onReact: (type: CommunityReactionType) => void;
  onReport: () => void;
  onCommentUpdated?: (postId: string, newCount: number) => void;
  onDelete?: (postId: string) => void;
  canManage?: boolean;
}

export default function CommunityPostCard({
  post,
  onReact,
  onReport,
  onCommentUpdated,
  onDelete,
  canManage = false,
}: CommunityPostCardProps) {
  const translate = useTranslations("Common");
  const locale = useLocale();
  
  const { user: currentUser } = useAuthStore();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [overrideCommentCount, setOverrideCommentCount] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const commentInputRef = useRef<HTMLInputElement>(null);

  const commentCount = overrideCommentCount ?? (post.commentCount ?? 0);
  const tournamentStatus = post.tournament?.status?.toUpperCase();
  const shouldShowTournamentBracket =
    post.type === 'TOURNAMENT_BRACKET' ||
    Boolean(post.tournament?.hasBracket) ||
    tournamentStatus === 'ONGOING' ||
    tournamentStatus === 'IN_PROGRESS' ||
    tournamentStatus === 'COMPLETED' ||
    tournamentStatus === 'FINISHED';

  const isAuthor = Boolean(currentUser?.id && post.author?.id && currentUser.id === post.author.id);
  const canDelete = isAuthor || canManage;

  // Popover Profile State
  const [popoverUser, setPopoverUser] = useState<PopoverUserProfile | null>(null);
  const [popoverAnchorRect, setPopoverAnchorRect] = useState<DOMRect | null>(null);
  const [tagPresets, setTagPresets] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [authorMemberInfo, setAuthorMemberInfo] = useState<{ role?: string; tags?: string[] } | null>(null);

  const authorName = post.author?.fullName?.trim() || translate('clubMemberFallback');
  const authorAvatar = post.author?.avatarUrl;

  // Fetch tag presets and author member tags for the post header
  useEffect(() => {
    let mounted = true;
    if (post.communityId) {
      communitiesApi.getTagPresets(post.communityId)
        .then((res) => {
          if (mounted && res.data) setTagPresets(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [post.communityId]);

  useEffect(() => {
    let mounted = true;
    if (post.communityId && post.author?.id) {
      const authorId = post.author.id;
      communitiesApi.getMembers(post.communityId, { limit: 100 })
        .then((res) => {
          if (!mounted) return;
          const raw = res.data;
          const list = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as any)?.data)
            ? (raw as any).data
            : [];
          const found = list.find(
            (m: any) => m.user?.id === authorId || m.member?.userId === authorId || m.userId === authorId,
          );
          if (found) {
            const rawFound = found as any;
            setAuthorMemberInfo({
              role: found.member?.role || rawFound.role,
              tags: found.member?.tags || rawFound.tags || [],
            });
          }
        })
        .catch(() => {});
    }

    const handleTagsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ communityId?: string; userId: string; tags: string[] }>;
      if (
        customEvent.detail &&
        customEvent.detail.userId === post.author?.id &&
        (!customEvent.detail.communityId || customEvent.detail.communityId === post.communityId)
      ) {
        setAuthorMemberInfo((prev) => ({
          role: prev?.role,
          tags: customEvent.detail.tags,
        }));
      }
    };

    window.addEventListener('sporto:member-tags-updated', handleTagsUpdated);

    return () => {
      mounted = false;
      window.removeEventListener('sporto:member-tags-updated', handleTagsUpdated);
    };
  }, [post.communityId, post.author?.id]);

  const handleOpenAuthorProfile = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPopoverUser({
      id: post.author.id,
      fullName: authorName,
      avatarUrl: authorAvatar,
      joinedAt: post.createdAt,
    });
    setPopoverAnchorRect(rect);
  };

  const handleOpenMentionProfile = (
    event: React.MouseEvent<HTMLElement>,
    mentionName: string,
  ) => {
    event.stopPropagation();
    const cleanName = mentionName.replace(/^@/, "").trim();
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Nếu mention chính là author
    if (cleanName === authorName) {
      setPopoverUser({
        id: post.author.id,
        fullName: authorName,
        avatarUrl: authorAvatar,
        joinedAt: post.createdAt,
      });
      setPopoverAnchorRect(rect);
      return;
    }

    // Tra cứu thông tin member qua mention
    setPopoverUser({
      id: "", // Sẽ được fetch hoặc tra cứu
      fullName: cleanName,
      avatarUrl: null,
    });
    setPopoverAnchorRect(rect);

    // Tìm kiếm profile chính xác qua tên
    communitiesApi
      .getMembers(post.communityId, { search: cleanName, limit: 1 })
      .then((res) => {
        const found = (res.data ?? []).find(
          (m) =>
            m.user?.fullName?.trim().toLowerCase() === cleanName.toLowerCase(),
        );
        if (found) {
          setPopoverUser({
            id: found.user.id,
            fullName: found.user.fullName,
            avatarUrl: found.user.avatarUrl,
            role: found.member.role,
            tags: found.member.tags,
            joinedAt: found.member.joinedAt,
          });
        }
      })
      .catch(() => {});
  };

  /** Helper parse text to highlight @mentions & #hashtags */
  const renderRichContent = (content: string) => {
    if (!content) return null;

    const lines = content.split("\n");

    return lines.map((line, lineIdx) => {
      const regex = /(@[^\s@#]+(?:\s+[^\s@#]+)*|#[a-zA-Z0-9_\u00C0-\u1EF9]+)/gu;
      const parts: Array<{ text: string; isMention: boolean; isHashtag: boolean }> = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            text: line.substring(lastIndex, match.index),
            isMention: false,
            isHashtag: false,
          });
        }
        const token = match[0];
        parts.push({
          text: token,
          isMention: token.startsWith("@"),
          isHashtag: token.startsWith("#"),
        });
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push({
          text: line.substring(lastIndex),
          isMention: false,
          isHashtag: false,
        });
      }

      return (
        <span key={lineIdx} className="block min-h-[1.25rem]">
          {parts.map((part, partIdx) => {
            if (part.isMention) {
              return (
                <button
                  type="button"
                  key={partIdx}
                  onClick={(e) => handleOpenMentionProfile(e, part.text)}
                  className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold text-xs border border-blue-100/80 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer select-none"
                >
                  {part.text}
                </button>
              );
            }
            if (part.isHashtag) {
              return (
                <span
                  key={partIdx}
                  className="inline-flex items-center mx-0.5 px-1 py-0.5 rounded text-blue-600 font-semibold text-xs hover:underline cursor-pointer"
                >
                  {part.text}
                </span>
              );
            }
            return <span key={partIdx}>{part.text}</span>;
          })}
        </span>
      );
    });
  };

  const [showComments, setShowComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);

  const loadComments = async (forceShow = true) => {
    if (showComments && !forceShow) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    if (comments.length > 0 && !forceShow) return;
    setLoadingComments(true);
    try {
      const response = await communitiesApi.getComments(
        post.communityId,
        post.id,
        { limit: 50 },
      );
      const fetched = response.data ?? [];
      setComments(fetched);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('loadCommentsFailed')));
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    const body = commentText.trim();
    if (!body || submittingComment) return;
    setSubmittingComment(true);
    try {
      const response = await communitiesApi.createComment(
        post.communityId,
        post.id,
        { body, parentId: replyingTo?.id },
      );
      const newComment: CommunityComment = {
        ...response.data,
        author: response.data?.author?.fullName ? response.data.author : {
          id: currentUser?.id || "",
          fullName: currentUser?.fullName || translate('youFallback'),
          avatarUrl: currentUser?.avatarUrl || null,
        },
      };
      setComments((current) => [...current, newComment]);
      setOverrideCommentCount((c) => {
        const next = (c ?? (post.commentCount ?? 0)) + 1;
        onCommentUpdated?.(post.id, next);
        return next;
      });
      setCommentText("");
      setReplyingTo(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('sendCommentFailed')));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(translate('deleteCommentConfirm'))) return;
    try {
      await communitiesApi.deleteComment(post.communityId, commentId);
      // Remove deleted comment and any direct replies to it
      const deletedIds = new Set([commentId]);
      comments.forEach((c) => {
        if (c.parentId === commentId) deletedIds.add(c.id);
      });
      const remaining = comments.filter((c) => !deletedIds.has(c.id));
      setComments(remaining);
      setOverrideCommentCount((c) => {
        const next = Math.max(0, (c ?? (post.commentCount ?? 0)) - 1);
        onCommentUpdated?.(post.id, next);
        return next;
      });
      toast.success(translate('commentDeleted'));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('deleteCommentFailed')));
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm(translate('deletePostConfirm'))) return;
    setIsDeleting(true);
    try {
      await communitiesApi.deletePost(post.communityId, post.id);
      toast.success(translate('postDeleted'));
      onDelete?.(post.id);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('deletePostFailed')));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <article
        id={`post-${post.id}`}
        className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-500 hover:shadow-md target:ring-2 target:ring-blue-500 target:border-blue-500 target:bg-blue-50/20 scroll-mt-24"
      >
        {/* Header: Author info, Delete & Report */}
        <div className="flex items-center gap-3">
          <div
            onClick={handleOpenAuthorProfile}
            className="cursor-pointer transition-transform hover:scale-105"
            title={translate("viewProfileAction")}
          >
            <CommunityAvatar
              src={authorAvatar}
              name={authorName}
              size={42}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleOpenAuthorProfile}
                className="truncate text-left text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {authorName}
              </button>

              {/* Author Community Role Badge */}
              {authorMemberInfo?.role === "OWNER" && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 shadow-2xs">
                  {translate('communityOwner')}
                </span>
              )}
              {authorMemberInfo?.role === "MODERATOR" && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 shadow-2xs">
                  {translate('communityModerator')}
                </span>
              )}

              {/* Author Member Tags / Badges in Post Header */}
              {authorMemberInfo?.tags && authorMemberInfo.tags.length > 0 && (
                <div className="flex items-center flex-wrap gap-1">
                  {authorMemberInfo.tags.map((tag) => {
                    const preset = tagPresets.find((p) => isSameCommunityTag(p.name, tag));
                    const displayTag = getCommunityTagDisplayName(tag, translate);
                    return (
                      <span
                        key={tag}
                        onClick={handleOpenAuthorProfile}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold shadow-2xs border cursor-pointer transition hover:scale-105"
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
                        <span className="w-1 h-1 rounded-full bg-slate-900/40 shrink-0" />
                        {displayTag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {formatRelativeTime(post.createdAt, locale)}
              {post.status === "PENDING" ? translate('pendingReviewSuffix') : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {canDelete && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePost}
                aria-label={translate("deletePostAction")}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-50 cursor-pointer"
                title={isAuthor ? translate("deleteOwnPostAction") : translate("deletePostAction")}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onReport}
              aria-label={translate("reportPostTitle")}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
              title={translate("reportPostTitle")}
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Pending status banner */}
        {post.status === "PENDING" && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 border border-amber-200/60">
            {translate('pendingPostReview')}
          </div>
        )}

        {/* Post Content */}
        {post.type === 'TOURNAMENT_BRACKET' ? (
          <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-3 text-sm font-semibold text-blue-800">
            <Trophy className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span>{translate('tournamentBracketUpdated')}</span>
          </div>
        ) : post.content ? (
          <div className="mt-3.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {renderRichContent(post.content)}
          </div>
        ) : null}


        {/* Tournament Bracket / Preview / Poll Area */}
        {post.tournamentId ? (
          !shouldShowTournamentBracket && post.poll && (tournamentStatus === 'REGISTRATION_OPEN' || tournamentStatus === 'UPCOMING' || !tournamentStatus) ? (
            <>
              {/* Registration / Pre-Tournament Summary Card */}
              <div className="mt-3.5 overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-blue-100/80 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          {translate('clubTournamentBadge')}
                        </span>
                        {post.tournament?.categoryName && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {post.tournament.categoryName}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-slate-900 line-clamp-1">
                        {post.tournament?.name || translate('clubTournamentFallback')}
                      </h4>
                      {post.tournament?.startDate && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {translate('tournamentStarts')} {new Date(post.tournament.startDate).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/tournaments/${post.tournamentId}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 shrink-0"
                  >
                    <span>{translate('viewTournamentDetails')}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Poll Component (Facebook Style) */}
              <CommunityPollCard
                communityId={post.communityId}
                poll={post.poll}
                tournamentInviteCode={post.tournament?.inviteCode}
              />
            </>
          ) : (
            <CommunityTournamentBracketWidget
              tournamentId={post.tournamentId}
              initialTournamentName={post.tournament?.name}
              categoryName={post.tournament?.categoryName}
              status={post.tournament?.status || undefined}
              isLite={Boolean(post.tournament?.isLite)}
            />
          )
        ) : (
          post.poll && (
            <CommunityPollCard
              communityId={post.communityId}
              poll={post.poll}
            />
          )
        )}

        {/* Images Grid with Click to Open Lightbox */}
        {post.imageUrls.length > 0 && (
          <div
            className={cn(
              "mt-3.5 gap-2 overflow-hidden rounded-xl",
              post.imageUrls.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2",
            )}
          >
            {post.imageUrls.map((url, idx) => (
              <div
                key={url}
                onClick={() => setLightboxIndex(idx)}
                className="group relative cursor-pointer overflow-hidden rounded-lg bg-slate-100"
              >
                <img
                  src={url}
                  alt={translate('postImageAlt', { index: idx + 1 })}
                  className={cn(
                    "w-full object-cover transition-transform duration-300 group-hover:scale-105",
                    post.imageUrls.length === 1 ? "max-h-[28rem] rounded-lg" : "aspect-video",
                  )}
                />
                {/* Hover overlay hint */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                  <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white shadow-md">
                    <Maximize2 className="h-3.5 w-3.5" />
                    {translate('zoomImage')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Interaction Actions */}
        <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => onReact("CHEER")}
            className={cn(
              "inline-flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors",
              post.viewerReaction === "CHEER"
                ? "text-rose-600 bg-rose-50 font-bold"
                : "hover:text-rose-600 hover:bg-slate-50",
            )}
          >
            <Heart
              className="h-4 w-4"
              fill={post.viewerReaction === "CHEER" ? "currentColor" : "none"}
            />
            <span>{post.reactionCount}</span>
          </button>
          <button
            type="button"
            onClick={() => void loadComments(false)}
            className={cn(
              "inline-flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors cursor-pointer",
              showComments ? "text-blue-600 bg-blue-50 font-bold" : "hover:text-blue-600 hover:bg-slate-50",
            )}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{translate('commentsCount', { count: commentCount })}</span>
          </button>
        </div>

        {/* Comments section */}
        {(showComments || comments.length > 0) && (
          <div className="mt-3.5 space-y-3.5 border-t border-slate-100 pt-3">
            {loadingComments ? (
              <div className="flex items-center justify-center py-3 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">{translate('loadingComments')}</span>
              </div>
            ) : (
              (() => {
                const rootComments = comments.filter((c) => !c.parentId);
                const replyMap = new Map<string, CommunityComment[]>();
                comments.forEach((c) => {
                  if (c.parentId) {
                    const list = replyMap.get(c.parentId) || [];
                    list.push(c);
                    replyMap.set(c.parentId, list);
                  }
                });

                const openCommentAuthorProfile = async (
                  event: React.MouseEvent<HTMLElement>,
                  comment: CommunityComment,
                  authorName: string,
                  authorAvatar?: string | null,
                ) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  const authorId = comment.author?.id?.trim();

                  if (authorId) {
                    setPopoverUser({
                      id: authorId,
                      fullName: authorName,
                      avatarUrl: authorAvatar,
                      joinedAt: comment.createdAt,
                    });
                    setPopoverAnchorRect(rect);
                    return;
                  }

                  setPopoverUser({ id: '', fullName: authorName, avatarUrl: authorAvatar });
                  setPopoverAnchorRect(rect);

                  try {
                    const response = await communitiesApi.getMembers(post.communityId, {
                      search: authorName,
                      limit: 10,
                    });
                    const found = (response.data ?? []).find(
                      (member) => member.user?.fullName?.trim().toLowerCase() === authorName.toLowerCase(),
                    );
                    if (found?.user?.id) {
                      setPopoverUser({
                        id: found.user.id,
                        fullName: found.user.fullName,
                        avatarUrl: found.user.avatarUrl,
                        role: found.member.role,
                        tags: found.member.tags,
                        joinedAt: found.member.joinedAt,
                      });
                    }
                  } catch {
                    // Keep the lightweight author preview when member lookup is unavailable.
                  }
                };

                const renderCommentItem = (comment: CommunityComment, isReply = false) => {
                  const authorName = comment.author?.fullName?.trim() || translate('member');
                  const authorAvatar = comment.author?.avatarUrl;

                  return (
                    <div
                      key={comment.id}
                      className={cn(
                        "flex items-start gap-2.5 text-xs group",
                        isReply && "pl-8 relative before:absolute before:left-3 before:top-3 before:bottom-0 before:w-0.5 before:bg-slate-200 before:content-['']"
                      )}
                    >
                      <button
                        type="button"
                        onClick={(e) => openCommentAuthorProfile(e, comment, authorName, authorAvatar)}
                        className="shrink-0 transition-transform hover:scale-105 cursor-pointer pt-0.5"
                      >
                        <CommunityAvatar
                          src={authorAvatar}
                          name={authorName}
                          size={isReply ? 26 : 32}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        {/* Bubble content */}
                        <div className="inline-block rounded-2xl bg-slate-100/90 px-3.5 py-2 text-xs border border-slate-200/60 max-w-full">
                          <button
                            type="button"
                            onClick={(e) => openCommentAuthorProfile(e, comment, authorName, authorAvatar)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer block text-left"
                          >
                            {authorName}
                          </button>
                          <p className="mt-0.5 text-slate-800 leading-relaxed break-words">{comment.body}</p>
                        </div>

                        {/* Actions under comment: Thích, Trả lời, Thời gian, Xóa */}
                        <div className="mt-1 flex items-center gap-3 pl-2 text-[11px] font-semibold text-slate-500">
                          <button
                            type="button"
                            onClick={() => {
                              setLikedComments((prev) => ({
                                ...prev,
                                [comment.id]: !prev[comment.id],
                              }));
                            }}
                            className={cn(
                              "hover:underline cursor-pointer transition-colors",
                              likedComments[comment.id] ? "text-rose-600 font-bold" : "hover:text-rose-600",
                            )}
                          >
                            {likedComments[comment.id] ? translate('likedAction') : translate('likeAction')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const targetRootId = comment.parentId || comment.id;
                              setReplyingTo({ id: targetRootId, authorName });
                              const mention = `@${authorName} `;
                              setCommentText(mention);
                              commentInputRef.current?.focus();
                            }}
                            className="hover:underline hover:text-blue-600 cursor-pointer"
                          >
                            {translate('replyAction')}
                          </button>
                          {comment.createdAt && (
                            <span className="text-slate-400 font-normal">
                              {formatRelativeTime(comment.createdAt, locale)}
                            </span>
                          )}
                          {(currentUser?.id === comment.author?.id || canManage) && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(comment.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                              title={translate("deleteCommentTitle")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-3">
                    {rootComments.map((root) => {
                      const replies = replyMap.get(root.id) || [];
                      return (
                        <div key={root.id} className="space-y-2.5">
                          {renderCommentItem(root, false)}
                          {replies.length > 0 && (
                            <div className="space-y-2.5">
                              {replies.map((rep) => renderCommentItem(rep, true))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Replying-to indicator */}
        {replyingTo && (
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-blue-50/80 px-3 py-1.5 text-xs text-blue-700">
            <span>
              {translate('replyingTo', { name: replyingTo.authorName })}
            </span>
            <button
              type="button"
              onClick={() => {
                setReplyingTo(null);
                setCommentText("");
              }}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
            >
              ✕ {translate('cancelAction')}
            </button>
          </div>
        )}

        {/* Comment input form with current user avatar */}
        <div className="mt-3.5 flex items-center gap-2.5">
          <div
            onClick={(e) => {
              if (currentUser?.id) {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setPopoverUser({
                  id: currentUser.id,
                  fullName: currentUser.fullName || translate('youFallback'),
                  avatarUrl: currentUser.avatarUrl,
                });
                setPopoverAnchorRect(rect);
              }
            }}
            className="shrink-0 cursor-pointer transition-transform hover:scale-105"
            title={translate("yourProfileAria")}
          >
            <CommunityAvatar
              src={currentUser?.avatarUrl}
              name={currentUser?.fullName || translate("youFallback")}
              size={32}
            />
          </div>
          <div className="flex-1 relative flex items-center">
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitComment();
                }
              }}
              placeholder={replyingTo ? translate('replyPlaceholder', { name: replyingTo.authorName }) : translate('commentPlaceholder')}
              className="w-full rounded-full border border-slate-200 bg-slate-100/80 px-4 py-2 text-xs text-slate-800 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 pr-14"
            />
            <button
              type="button"
              onClick={() => void submitComment()}
              disabled={submittingComment || !commentText.trim()}
              className="absolute right-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
            >
              {submittingComment ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                translate('submitAction')
              )}
            </button>
          </div>
        </div>
      </article>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        images={post.imageUrls}
        initialIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />

      {/* Mini Profile Popover (Facebook Style) */}
      <UserProfilePopover
        user={popoverUser}
        anchorRect={popoverAnchorRect}
        isOpen={popoverUser !== null && popoverAnchorRect !== null}
        onClose={() => {
          setPopoverUser(null);
          setPopoverAnchorRect(null);
        }}
        communityId={post.communityId}
      />
    </>
  );
}
