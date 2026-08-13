"use client";

import Image from "next/image";
import { useState } from "react";
import { Flag, Heart, Loader2, MessageCircle } from "lucide-react";
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

interface CommunityPostCardProps {
  post: CommunityPost;
  onReact: (type: CommunityReactionType) => void;
  onReport: () => void;
  onComment: () => void;
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
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <CommunityAvatar
          src={post.author.avatarUrl}
          name={post.author.fullName}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {post.author.fullName}
          </p>
          <p className="text-xs text-slate-400">
            {new Date(post.createdAt).toLocaleDateString("vi-VN")}
            {post.status === "PENDING" ? " · Đang chờ duyệt" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onReport}
          aria-label="Báo cáo bài viết"
          className="ml-auto text-slate-400 hover:text-rose-600"
        >
          <Flag className="h-4 w-4" />
        </button>
      </div>

      {post.status === "PENDING" && (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          Bài viết đang chờ ban quản trị duyệt.
        </div>
      )}
      {post.content && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {post.content}
        </p>
      )}
      {(post.topics ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.topics?.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
            >
              #{topic}
            </span>
          ))}
        </div>
      )}
      {post.imageUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {post.imageUrls.map((url) => (
            <Image
              key={url}
              src={url}
              alt="Ảnh bài viết"
              width={640}
              height={360}
              unoptimized
              className="aspect-video w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
        <button
          type="button"
          onClick={() => onReact("CHEER")}
          className={cn(
            "inline-flex items-center gap-1",
            post.viewerReaction === "CHEER"
              ? "text-rose-600"
              : "hover:text-rose-600",
          )}
        >
          <Heart
            className="h-4 w-4"
            fill={post.viewerReaction === "CHEER" ? "currentColor" : "none"}
          />
          {post.reactionCount}
        </button>
        <button
          type="button"
          onClick={() => void loadComments()}
          className="inline-flex items-center gap-1 hover:text-emerald-600"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount}
        </button>
      </div>

      {(loadingComments || comments.length > 0) && (
        <div className="mt-3 space-y-2">
          {loadingComments ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg bg-slate-50 px-3 py-2 text-xs"
              >
                <span className="font-bold text-slate-700">
                  {comment.author?.fullName ?? "Thành viên"}
                </span>
                <p className="mt-1 text-slate-600">{comment.body}</p>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submitComment();
          }}
          placeholder="Viết bình luận..."
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
        />
        <button
          type="button"
          onClick={() => void submitComment()}
          disabled={submittingComment}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          Gửi
        </button>
      </div>
    </article>
  );
}
