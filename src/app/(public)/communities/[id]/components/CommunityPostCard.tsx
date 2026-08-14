"use client";

import { useState } from "react";
import { Flag, Heart, Loader2, MessageCircle, Maximize2 } from "lucide-react";
import toast from "react-hot-toast";
import { communitiesApi } from "@/features/communities/api";
import type {
  CommunityComment,
  CommunityPost,
  CommunityReactionType,
} from "@/types/community-social";
import { cn } from "@/utils/cn";
import { getErrorMessage } from "@/utils/error";
import CommunityAvatar from "./CommunityAvatar";
import ImageLightboxModal from "@/components/common/ImageLightboxModal";

interface CommunityPostCardProps {
  post: CommunityPost;
  onReact: (type: CommunityReactionType) => void;
  onReport: () => void;
  onComment: () => void;
}

/** Helper parse text to highlight @mentions & #hashtags */
function renderRichContent(content: string) {
  if (!content) return null;

  // Tách dòng để giữ nguyên ngắt dòng
  const lines = content.split("\n");

  return lines.map((line, lineIdx) => {
    // Regex chuẩn bắt @[Tên có dấu và khoảng trắng] hoặc #Hashtag
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
              <span
                key={partIdx}
                className="inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold text-xs border border-blue-100/80 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer select-none"
              >
                {part.text}
              </span>
            );
          }
          if (part.isHashtag) {
            return (
              <span
                key={partIdx}
                className="inline-flex items-center mx-0.5 px-1 py-0.5 rounded text-emerald-600 font-semibold text-xs hover:underline cursor-pointer"
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
}

export default function CommunityPostCard({
  post,
  onReact,
  onReport,
  onComment,
}: CommunityPostCardProps) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const authorName = post.author?.fullName?.trim() || "Thành viên CLB";
  const authorAvatar = post.author?.avatarUrl;

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const response = await communitiesApi.getComments(
        post.communityId,
        post.id,
        { limit: 3 },
      );
      setComments(response.data ?? []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể tải bình luận."));
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
        { body },
      );
      setComments((current) => [...current, response.data]);
      onComment();
      setCommentText("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể gửi bình luận."));
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <>
      <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
        {/* Header: Author info & Report */}
        <div className="flex items-center gap-3">
          <CommunityAvatar
            src={authorAvatar}
            name={authorName}
            size={42}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer">
              {authorName}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              {post.status === "PENDING" ? " · Đang chờ duyệt" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onReport}
            aria-label="Báo cáo bài viết"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
            title="Báo cáo bài viết"
          >
            <Flag className="h-4 w-4" />
          </button>
        </div>

        {/* Pending status banner */}
        {post.status === "PENDING" && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 border border-amber-200/60">
            Bài viết đang chờ ban quản trị duyệt trước khi hiển thị công khai.
          </div>
        )}

        {/* Post Content */}
        {post.content && (
          <div className="mt-3.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {renderRichContent(post.content)}
          </div>
        )}

        {/* Topic Badges */}
        {(post.topics ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.topics?.map((topic) => (
              <span
                key={topic}
                className="rounded-md bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-xs font-semibold text-emerald-700"
              >
                #{topic}
              </span>
            ))}
          </div>
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
                  alt={`Ảnh bài viết ${idx + 1}`}
                  className={cn(
                    "w-full object-cover transition-transform duration-300 group-hover:scale-105",
                    post.imageUrls.length === 1 ? "max-h-[28rem] rounded-lg" : "aspect-video",
                  )}
                />
                {/* Hover overlay hint */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                  <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white shadow-md">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Phóng to
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
            onClick={() => void loadComments()}
            className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:text-emerald-700 hover:bg-slate-50 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.commentCount} bình luận</span>
          </button>
        </div>

        {/* Comments section */}
        {(loadingComments || comments.length > 0) && (
          <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-3">
            {loadingComments ? (
              <div className="flex items-center justify-center py-3 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Đang tải bình luận...</span>
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg bg-slate-50/80 p-3 text-xs border border-slate-100"
                >
                  <span className="font-bold text-slate-800">
                    {comment.author?.fullName ?? "Thành viên"}
                  </span>
                  <p className="mt-1 text-slate-700 leading-5">{comment.body}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Comment input form */}
        <div className="mt-3.5 flex gap-2">
          <input
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitComment();
            }}
            placeholder="Viết bình luận..."
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => void submitComment()}
            disabled={submittingComment}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            Gửi
          </button>
        </div>
      </article>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        images={post.imageUrls}
        initialIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}
