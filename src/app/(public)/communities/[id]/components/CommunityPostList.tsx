"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
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
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('SPAM');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const submitReport = async () => {
    if (!reportPostId || isReporting) return;
    try {
      setIsReporting(true);
      await communitiesApi.reportPost(communityId, reportPostId, { reason: reportReason, details: reportDetails.trim() || undefined });
      toast.success(translate('postReportSuccess'));
      setReportPostId(null);
      setReportDetails('');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, translate('postReportFailed')));
    } finally {
      setIsReporting(false);
    }
  };
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
          onReport={() => setReportPostId(post.id)}
          onCommentUpdated={onCommentUpdated}
        />
      ))}
      {reportPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-base font-bold text-slate-900">{translate('communityReportTitle')}</h2><p className="mt-1 text-xs text-slate-500">{translate('communityReportDescription')}</p></div>
              <button type="button" onClick={() => setReportPostId(null)} className="text-slate-400 hover:text-slate-700" aria-label={translate('communityReportClose')}>×</button>
            </div>
            <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-4 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800">
              <option value="SPAM">{translate('communityReportSpam')}</option><option value="HARASSMENT">{translate('communityReportHarassment')}</option><option value="HATE">{translate('communityReportHate')}</option><option value="SEXUAL">{translate('communityReportSexual')}</option><option value="VIOLENCE">{translate('communityReportViolence')}</option><option value="OTHER">{translate('communityReportOther')}</option>
            </select>
            <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={500} placeholder={translate('communityReportDetailsPlaceholder')} className="mt-3 min-h-24 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" />
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setReportPostId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">{translate('communityReportCancel')}</button><button type="button" disabled={isReporting} onClick={() => void submitReport()} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isReporting ? translate('communityReportSubmitting') : translate('communityReportSubmit')}</button></div>
          </div>
        </div>
      )}
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
          {translate('communityLoadMorePosts')}
        </button>
      )}
    </>
  );
}
