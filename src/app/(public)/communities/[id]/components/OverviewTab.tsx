"use client";

import { useEffect, useState } from "react";
import { communitiesApi } from "@/features/communities/api";
import type { CommunityDashboard } from "@/types/community-social";
import { getErrorMessage } from "@/utils/error";
import CommunityFeed from "./CommunityFeed";
import CommunityInfoSidebar from "./CommunityInfoSidebar";
import CommunityMatchPosts from "./CommunityMatchPosts";

interface OverviewTabProps {
  communityId: string;
  description?: string;
  rules?: string;
  canManageTags?: boolean;
  onGoToTournaments?: () => void;
  onGoToRankings?: () => void;
  onGoToGallery?: () => void;
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-[28rem] animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export default function OverviewTab({
  communityId,
  description,
  rules,
  canManageTags = false,
  onGoToGallery,
}: OverviewTabProps) {
  const [dashboard, setDashboard] = useState<CommunityDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(async () => {
      try {
        const response = await communitiesApi.getDashboard(communityId);
        if (mounted) setDashboard(response.data);
      } catch (error: unknown) {
        if (mounted) setErrorMessage(getErrorMessage(error, "Không thể tải tổng quan câu lạc bộ."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [communityId]);

  if (isLoading) return <DashboardSkeleton />;
  if (errorMessage) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">{errorMessage}</div>;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <CommunityInfoSidebar communityId={communityId} description={description} rules={rules} onGoToGallery={onGoToGallery} />
      <main className="min-w-0">
        {dashboard && <CommunityMatchPosts dashboard={dashboard} />}
        <CommunityFeed communityId={communityId} canManageTags={canManageTags} />
      </main>
    </div>
  );
}
