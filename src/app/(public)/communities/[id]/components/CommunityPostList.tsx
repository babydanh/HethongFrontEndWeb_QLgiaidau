"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { communitiesApi } from "@/features/communities/api";
import type {
  CommunityPost,
  CommunityReactionType,
} from "@/types/community-social";
import { cn } from "@/utils/cn";
import { getErrorMessage } from "@/utils/error";
import CommunityPostCard from "./CommunityPostCard";

interface CommunityPostListProps {
  communityId: string;
  posts: CommunityPost[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onReactionUpdated: (
    postId: string,
    reactionType: CommunityReactionType | null,
    count: number,
  ) => void;
  onCommentUpdated: (postId: string, newCount: number) => void;
  onDeletePost?: (postId: string) => void;
  canManage?: boolean;
}

export default function CommunityPostList({
  communityId,
  posts,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReactionUpdated,
  onCommentUpdated,
  onDeletePost,
  canManage = false,
}: CommunityPostListProps) {
  const translate = useTranslations('Common');
  return (
    <>
      {posts.map((post) => (
        <CommunityPostCard
          key={post.id}
          post={post}
          canManage={canManage}
          onDelete={onDeletePost}
          onReact={(type) => {
            void communitiesApi
              .reactToPost(communityId, post.id, type)
              .then((result) =>
                onReactionUpdated(
                  post.id,
                  result.data.reactionType,
                  result.data.count,
                ),
              )
              .catch((error: unknown) =>
                toast.error(
                  getErrorMessage(error, translate('reactionUpdateFailed')),
                ),
              );
          }}
          onReport={() => {
            void communitiesApi
              .reportPost(communityId, post.id, { reason: "OTHER" })
              .then(() => toast.success(translate('postReportSuccess')))
              .catch((error: unknown) =>
                toast.error(getErrorMessage(error, translate('postReportFailed'))),
              );
          }}
          onCommentUpdated={onCommentUpdated}
        />
      ))}
      {hasMore && (
        <button
          type="button"
          disabled={isLoadingMore}
          onClick={onLoadMore}
          className={cn(
            "mx-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700",
            isLoadingMore && "opacity-60",
          )}
        >
          {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
          Xem thêm bài viết
        </button>
      )}
    </>
  );
}
