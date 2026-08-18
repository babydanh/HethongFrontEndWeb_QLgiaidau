'use client';

import Image from 'next/image';
import React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Shield, Users } from 'lucide-react';
import type { FootballRegistrationGroup, TournamentParticipant } from '@/types/tournament';
import { cn } from '@/utils/cn';
import {
  getParticipantStatusClassName,
  getParticipantStatusLabel,
} from '@/utils/tournament-display';

interface FootballRegistrationGroupsProps {
  participants: TournamentParticipant[];
  divisionNames: ReadonlyMap<string, string>;
  directParticipation?: boolean;
  renderParticipantActions: (participant: TournamentParticipant) => React.ReactNode;
  renderParticipantIdentity?: (participant: TournamentParticipant) => React.ReactNode;
}

function groupFootballRegistrations(
  participants: TournamentParticipant[],
  divisionNames: ReadonlyMap<string, string>,
): FootballRegistrationGroup[] {
  const grouped = new Map<string, FootballRegistrationGroup>();

  participants.forEach((participant) => {
    // Legacy football registrations may predate the team link. Keep them visible
    // as an orphan group instead of silently dropping a registration from review.
    const footballTeamId = participant.footballTeamId ?? `legacy:${participant.id}`;
    const divisionId = participant.tournamentDivisionId ?? 'default';
    const key = `${divisionId}:${footballTeamId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.participants.push(participant);
      return;
    }

    grouped.set(key, {
      key,
      footballTeamId,
      teamName: participant.teamName,
      logoUrl: participant.footballTeamLogoUrl,
      divisionName: divisionNames.get(divisionId) ?? 'Hình thức bóng đá',
      participants: [participant],
    });
  });

  return [...grouped.values()].sort((left, right) => {
    const leftSeed = left.participants[0]?.seed ?? Number.MAX_SAFE_INTEGER;
    const rightSeed = right.participants[0]?.seed ?? Number.MAX_SAFE_INTEGER;
    return leftSeed - rightSeed || left.teamName.localeCompare(right.teamName, 'vi');
  });
}

function uniqueMembers(group: FootballRegistrationGroup) {
  const members = new Map<string, TournamentParticipant['members'][number]>();
  group.participants.forEach((participant) => {
    participant.members.forEach((member) => members.set(member.userId, member));
  });
  return [...members.values()];
}

export function FootballRegistrationGroups({
  participants,
  divisionNames,
  directParticipation = false,
  renderParticipantActions,
  renderParticipantIdentity,
}: FootballRegistrationGroupsProps) {
  const translate = useTranslations('TournamentDisplay');
  const participantStatusLabels = {
    participantComplete: translate('participantComplete'),
    participantPendingPartner: translate('participantPendingPartner'),
    participantPendingApproval: translate('participantPendingApproval'),
    participantWaitlisted: translate('participantWaitlisted'),
    participantRejected: translate('participantRejected'),
    participantWithdrawn: translate('participantWithdrawn'),
    participantKicked: translate('participantKicked'),
    participantDisqualified: translate('participantDisqualified'),
    participantNoShow: translate('participantNoShow'),
    participantReplaced: translate('participantReplaced'),
    unknownParticipant: translate('unknownParticipant'),
  };
  const groups = React.useMemo(
    () => groupFootballRegistrations(participants, divisionNames),
    [divisionNames, participants],
  );
  const [expandedKeys, setExpandedKeys] = React.useState<ReadonlySet<string>>(new Set());

  const toggleGroup = (key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="py-12">
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <Users className="h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">Không có đội bóng phù hợp</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Thử đổi bộ lọc hoặc từ khóa để rà lại danh sách đội.</p>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {groups.map((group) => {
        const expanded = expandedKeys.has(group.key);
        const members = uniqueMembers(group);
        const statuses = [...new Set(group.participants.map((participant) => (
          directParticipation && (participant.teamStatus === 'PENDING_APPROVAL' || participant.teamStatus === 'PENDING')
            ? 'COMPLETE'
            : participant.teamStatus
        )))];
        const isPaid = group.participants.every((participant) => participant.isPaid);

        return (
          <React.Fragment key={group.key}>
            <tr className="bg-slate-50/80">
              <td colSpan={5} className="p-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-100"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-xs font-bold text-blue-700">
                    {group.logoUrl ? (
                      <Image src={group.logoUrl} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      group.teamName.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">{group.teamName}</span>
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{group.divisionName}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{members.length} thành viên</span>
                      <span>{group.participants.length} hồ sơ</span>
                      <span>{isPaid ? 'Đã thanh toán' : 'Còn phí chưa thanh toán'}</span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                    {statuses.map((status) => (
                      <span key={status ?? 'unknown'} className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold', getParticipantStatusClassName(status))}>
                        {getParticipantStatusLabel(status, participantStatusLabels)}
                      </span>
                    ))}
                  </span>
                </button>
              </td>
            </tr>
            {expanded && (
              <tr>
                <td colSpan={5} className="bg-white px-4 pb-4 pt-0">
                  <div className="ml-11 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      <Shield className="h-4 w-4 text-blue-600" /> Thành viên và hồ sơ đăng ký
                    </div>
                    <div className="space-y-3">
                      {group.participants.map((participant) => (
                        <div key={participant.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {renderParticipantIdentity?.(participant) ?? (
                                  <span className="text-sm font-bold text-slate-900">{participant.teamName}</span>
                                )}
                                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', getParticipantStatusClassName(
                                  directParticipation && (participant.teamStatus === 'PENDING_APPROVAL' || participant.teamStatus === 'PENDING')
                                    ? 'COMPLETE'
                                    : participant.teamStatus,
                                ))}>
                                  {getParticipantStatusLabel(
                                    directParticipation && (participant.teamStatus === 'PENDING_APPROVAL' || participant.teamStatus === 'PENDING')
                                      ? 'COMPLETE'
                                      : participant.teamStatus,
                                    participantStatusLabels,
                                  )}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500">{participant.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {participant.members.map((member) => (
                                  <span key={member.userId} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    {member.fullName || 'Chưa rõ'}
                                    <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold', member.role === 'RESERVE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                                      {member.role === 'RESERVE' ? 'Dự bị' : member.role === 'MAIN' ? 'Chính' : member.role}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                              {renderParticipantActions(participant)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
