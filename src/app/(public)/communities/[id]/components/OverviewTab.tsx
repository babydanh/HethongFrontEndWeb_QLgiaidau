"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Calendar,
  ChevronRight,
  Medal,
  Trophy,
  Users,
} from "lucide-react";
import { communitiesApi } from "@/features/communities/api";
import type { CommunityDashboard } from "@/types/community-social";
import { getErrorMessage } from "@/utils/error";
import { EloTierBadge } from "@/components/ui/EloTierBadge";
import CommunityFeed from "./CommunityFeed";

interface OverviewTabProps {
  communityId: string;
  canManageTags?: boolean;
  onGoToTournaments?: () => void;
  onGoToRankings?: () => void;
}

function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  );
}

function EmptyBlock({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
      <div className="mx-auto mb-2 flex justify-center text-slate-300">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {text}
      </p>
    </div>
  );
}

function ViewAllLink({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-28 animate-pulse rounded-lg bg-slate-100 lg:col-span-2" />
    </div>
  );
}

export default function OverviewTab({
  communityId,
  canManageTags = false,
  onGoToTournaments,
  onGoToRankings,
}: OverviewTabProps) {
  const router = useRouter();
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
        if (mounted)
          setErrorMessage(
            getErrorMessage(error, "Không thể tải tổng quan câu lạc bộ."),
          );
      } finally {
        if (mounted) setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [communityId]);

  if (isLoading) return <DashboardSkeleton />;
  if (errorMessage)
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        {errorMessage}
      </div>
    );
  if (!dashboard) return null;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <aside className="space-y-5 lg:sticky lg:top-24">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle
            icon={
              <Activity
                className="h-4 w-4 text-emerald-600"
                strokeWidth={1.5}
              />
            }
            title="Trận gần đây"
            action={
              <ViewAllLink label="Xem tất cả" onClick={onGoToTournaments} />
            }
          />
          {dashboard.recentMatches.length === 0 ? (
            <EmptyBlock
              icon={<Activity className="h-10 w-10" />}
              text="Chưa có trận đấu"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {dashboard.recentMatches.map((match) => (
                <li key={match.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                      {match.playerA?.fullName ?? "Chưa xác định"}{" "}
                      <span className="mx-1.5 text-slate-400">
                        {match.scoreA}-{match.scoreB}
                      </span>{" "}
                      {match.playerB?.fullName ?? "Chưa xác định"}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${match.eloDelta >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                    >
                      {match.eloDelta >= 0
                        ? `+${match.eloDelta}`
                        : match.eloDelta}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle
            icon={
              <Medal className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
            }
            title="Top ELO"
            action={<ViewAllLink label="Xem BXH" onClick={onGoToRankings} />}
          />
          {dashboard.topPlayers.length === 0 ? (
            <EmptyBlock
              icon={<Medal className="h-10 w-10" />}
              text="Chưa có xếp hạng"
            />
          ) : (
            <ul className="space-y-3">
              {dashboard.topPlayers.map((player) => (
                <li key={player.userId} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                    {player.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                    {player.fullName}
                  </span>
                  <EloTierBadge
                    elo={player.elo}
                    tierName={player.tierName ?? undefined}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle
            icon={
              <Trophy className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
            }
            title="Giải nổi bật"
          />
          {!dashboard.featuredTournament ? (
            <EmptyBlock
              icon={<Trophy className="h-10 w-10" />}
              text="Chưa có giải nổi bật"
            />
          ) : (
            <div className="space-y-3">
              <p className="truncate font-bold text-slate-900">
                {dashboard.featuredTournament.name}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {dashboard.featuredTournament.status}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {dashboard.featuredTournament.participantCount} VĐV
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/tournaments/${dashboard.featuredTournament?.id}`,
                  )
                }
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Xem giải <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </section>
      </aside>

      <CommunityFeed communityId={communityId} canManageTags={canManageTags} />
    </div>
  );
}
