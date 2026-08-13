import { CalendarClock, CircleDot, Trophy } from "lucide-react";
import Link from "next/link";
import type { CommunityDashboard } from "@/types/community-social";

interface CommunityMatchPostsProps {
  dashboard: CommunityDashboard;
}

function playerName(player: { fullName: string } | null): string {
  return player?.fullName ?? "Đang chờ đối thủ";
}

function formatDate(value: string | null): string {
  if (!value) return "Chưa xếp lịch";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function CommunityMatchPosts({ dashboard }: CommunityMatchPostsProps) {
  const live = dashboard.recentMatches.filter((match) => ["LIVE", "ONGOING", "IN_PROGRESS", "STARTED", "PLAYING"].includes(match.status));
  const scheduled = dashboard.upcomingMatches;
  const completed = dashboard.recentMatches.filter((match) => !live.includes(match));
  const hasPosts = live.length > 0 || scheduled.length > 0 || completed.length > 0;

  if (!hasPosts) return null;

  return (
    <section className="mb-5 space-y-3">
      {[...live.map((match) => ({ kind: "live" as const, match })), ...scheduled.map((match) => ({ kind: "scheduled" as const, match })), ...completed.map((match) => ({ kind: "completed" as const, match }))].map(({ kind, match }) => {
        const isRecent = "scoreA" in match;
        const statusLabel = kind === "live" ? "Đang diễn ra" : kind === "scheduled" ? "Sắp diễn ra" : "Vừa kết thúc";
        return (
          <Link href={`/matches/${match.id}`} key={`${kind}-${match.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${kind === "live" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-700"}`}>
                {kind === "live" ? <CircleDot className="h-3.5 w-3.5" /> : kind === "scheduled" ? <CalendarClock className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
                {statusLabel}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Bài viết hệ thống</span>
            </div>
            <p className="text-sm font-bold text-slate-900">{playerName(match.playerA)} <span className="px-2 text-slate-400">{isRecent ? `${match.scoreA} - ${match.scoreB}` : "vs"}</span> {playerName(match.playerB)}</p>
            <p className="mt-2 text-xs text-slate-500">{isRecent ? formatDate(match.playedAt) : formatDate(match.scheduledAt)}</p>
          </Link>
        );
      })}
    </section>
  );
}
