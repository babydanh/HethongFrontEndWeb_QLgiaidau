'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Shield, Trophy, Users, ChevronRight, Flame } from 'lucide-react';
import { footballTeamsApi, type FootballTeam } from '@/features/tournaments/api';
import type { FootballTeamRanking } from '@/features/rankings/api';

interface Props {
  team: FootballTeam;
  ranking?: FootballTeamRanking | null;
  position?: number | null;
}

export default function FootballTeamEloCard({ team, ranking, position }: Props) {
  const translate = useTranslations('Common');
  const [teamDetail, setTeamDetail] = useState<FootballTeam>(team);
  const [logoError, setLogoError] = useState(false);
  const [captainAvatarError, setCaptainAvatarError] = useState(false);

  // Tự động nạp chi tiết đội nếu chưa có danh sách thành viên để lấy chính xác hồ sơ Đội trưởng
  useEffect(() => {
    setTeamDetail(team);
    if (!team.members || team.members.length === 0) {
      let cancelled = false;
      footballTeamsApi
        .get(team.id)
        .then((res) => {
          if (!cancelled && res.data) {
            setTeamDetail((prev) => ({
              ...prev,
              ...res.data,
              members: res.data.members || prev.members,
            }));
          }
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }
  }, [team]);

  const rank = ranking ?? teamDetail.rank ?? team.rank;
  const matchesPlayed = rank?.matchesPlayed ?? 0;
  const matchesWon = rank?.matchesWon ?? 0;
  const winStreak = rank?.winStreak ?? 0;
  const eloPoints = rank?.eloPoints ?? 1000;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const tierLabel = matchesPlayed > 0 ? rank?.tierName || translate('ranked') : translate('unranked');

  // Tìm thành viên giữ băng Đội trưởng (role === 'CAPTAIN')
  const members = teamDetail.members || [];
  const captainMember = members.find((m) => m.role === 'CAPTAIN');
  const captainName =
    captainMember?.profile?.fullName ||
    (teamDetail.membership?.role === 'CAPTAIN'
      ? translate('you')
      : captainMember?.userId
        ? `Cầu thủ #${captainMember.userId.slice(0, 6)}`
        : translate('teamCaptain'));
  const captainAvatar = captainMember?.profile?.avatarUrl;

  // Vai trò của tài khoản hiện tại đối với đội này
  const myRole = teamDetail.membership?.role;
  const myRoleLabel = myRole === 'CAPTAIN' ? translate('teamCaptain') : myRole === 'MANAGER' ? translate('teamManager') : translate('teamMember');

  const activeMembersCount = members.filter((m) => m.status === undefined || m.status === 'ACTIVE').length || 1;

  return (
    <section className="rounded-2xl border border-blue-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md">
      {/* Header Bar */}
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-800 border border-blue-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            {translate('teamElo')}
          </span>
          {winStreak >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200" title={`Chuỗi ${winStreak} trận thắng liên tiếp`}>
              <Flame className="h-3 w-3 text-amber-500 fill-amber-500" />
              {winStreak}W
            </span>
          )}
        </div>
        <Link
          href={`/football-teams?teamId=${team.id}`}
          className="group inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          {translate('manageTeam')}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Main Team Identity Block */}
      <div className="flex items-center gap-3.5">
        {/* Team Athletic Badge Logo */}
        <div className="relative flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-blue-200/80 bg-linear-to-br from-blue-500 to-indigo-600 p-0.5 shadow-sm">
          {team.logoUrl && !logoError ? (
            <img
              src={team.logoUrl}
              alt={`Logo ${team.name}`}
              onError={() => setLogoError(true)}
              className="h-full w-full rounded-[14px] bg-white object-cover"
            />
          ) : (
            <span className="font-black tracking-tight text-white text-base">
              {team.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Team Name & Current User Role */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black text-slate-900 tracking-tight" title={team.name}>
            {team.name}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              <Users className="h-3 w-3 text-slate-500" />
              {activeMembersCount} cầu thủ
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
              {myRole === 'CAPTAIN' ? '⭐ Bạn là Đội trưởng' : `Bạn là ${myRoleLabel}`}
            </span>
          </div>
        </div>
      </div>

      {/* Real Team Captain Banner */}
      <div className="mt-3.5 flex items-center justify-between gap-2.5 rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-white shadow-2xs">
              {captainAvatar && !captainAvatarError ? (
                <img
                  src={captainAvatar}
                  alt={captainName}
                  onError={() => setCaptainAvatarError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-blue-700">
                  {captainName.trim().slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            {/* Captain Armband Badge 'C' */}
            <span
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-500 text-[9px] font-black text-slate-950 shadow-xs"
              title="Băng Đội trưởng"
            >
              C
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {translate('teamCaptain')}
            </p>
            <p className="truncate text-xs font-extrabold text-slate-900" title={captainName}>
              {captainName}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Trạng thái</span>
          <span className="text-xs font-extrabold text-blue-700 block truncate max-w-24">
            {tierLabel}
          </span>
        </div>
      </div>

      {/* 4-Column Stats Grid */}
      <div className="mt-3.5 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center">
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">ELO</p>
          <p className="mt-0.5 text-base font-black tabular-nums text-blue-700">{eloPoints}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">{translate('rank')}</p>
          <p className="mt-0.5 text-base font-black tabular-nums text-slate-900">{position ? `#${position}` : '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Trận/Thắng</p>
          <p className="mt-0.5 text-xs font-black tabular-nums text-slate-800">
            {matchesPlayed > 0 ? `${matchesPlayed}/${matchesWon}` : '0/0'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Tỉ lệ</p>
          <p className="mt-0.5 text-xs font-black tabular-nums text-blue-700">
            {matchesPlayed > 0 ? `${winRate}%` : '—'}
          </p>
        </div>
      </div>

      {/* Footer match summary */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          {matchesPlayed > 0 ? <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Shield className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
          <span>{matchesPlayed > 0 ? translate('matchesSummary', { played: matchesPlayed, won: matchesWon }) : translate('noRankedMatch')}</span>
        </span>
      </div>
    </section>
  );
}
