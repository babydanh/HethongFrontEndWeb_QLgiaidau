"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { communitiesApi } from "@/features/communities/api";
import type { CommunityDashboard } from "@/types/community-social";
import { getErrorMessage } from "@/utils/error";
import CommunityFeed from "./CommunityFeed";
import CommunityInfoSidebar from "./CommunityInfoSidebar";
import CommunityMatchPosts from "./CommunityMatchPosts";
import { LockKeyhole } from "lucide-react";

interface OverviewTabProps {
  communityId: string;
  description?: string;
  rules?: string;
  socialLinks?: Record<string, string>;
  canManageTags?: boolean;
  visibility?: "PUBLIC" | "RESTRICTED" | "PRIVATE";
  canViewContent?: boolean;
  canViewFeed?: boolean;
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
  socialLinks,
  canManageTags = false,
  visibility = "PUBLIC",
  canViewContent = true,
  canViewFeed = canViewContent,
  onGoToGallery,
}: OverviewTabProps) {
  const translate = useTranslations("Common");
  const [dashboard, setDashboard] = useState<CommunityDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!canViewContent) {
      setIsLoading(false);
      return () => { mounted = false; };
    }
    Promise.resolve().then(async () => {
      try {
        const response = await communitiesApi.getDashboard(communityId);
        if (mounted) setDashboard(response.data);
      } catch (error: unknown) {
        if (mounted) setErrorMessage(getErrorMessage(error, translate('overviewLoadFailed')));
      } finally {
        if (mounted) setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [communityId, canViewContent]);

  if (isLoading) return <DashboardSkeleton />;
  if (errorMessage) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">{errorMessage}</div>;

  if (!canViewFeed) {
    const isPrivate = visibility === "PRIVATE";
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <LockKeyhole className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{isPrivate ? translate('privateClubTitle') : translate('membersOnlyTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {isPrivate
            ? translate('privateClubDescription')
            : translate('joinClubDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <CommunityInfoSidebar
        communityId={communityId}
        description={description}
        rules={rules}
        socialLinks={socialLinks}
        onGoToGallery={onGoToGallery}
      />
      <main className="min-w-0">
        {dashboard && <CommunityMatchPosts dashboard={dashboard} />}
        {canViewFeed && <CommunityFeed communityId={communityId} canManageTags={canManageTags} />}
      </main>

    </div>
  );
}
