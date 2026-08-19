'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MoreHorizontal, Search, ShieldAlert, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import type { TournamentParticipant } from '@/types/tournament';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import {
  getParticipantStatusClassName,
  getParticipantStatusLabel,
  isParticipantApproved,
} from '@/utils/tournament-display';

interface OpsParticipantsProps {
  participants: TournamentParticipant[];
  activeParticipantActionId: string | null;
  onKickParticipant: (participantId: string, reason: string) => Promise<void>;
}

type ParticipantFilter = 'ALL' | 'COMPLETE' | 'UNPAID' | 'KICKED' | 'DISCIPLINED';

interface KickDraft {
  id: string;
  teamName: string;
}

const FILTER_OPTIONS: ParticipantFilter[] = ['ALL', 'COMPLETE', 'UNPAID', 'KICKED', 'DISCIPLINED'];

export function OpsParticipants({
  participants,
  activeParticipantActionId,
  onKickParticipant,
}: OpsParticipantsProps) {
  const translate = useTranslations('TournamentDisplay');
  const opsTranslate = useTranslations('OrganizerOps');
  const filterLabels: Record<ParticipantFilter, string> = {
    ALL: opsTranslate('filterAll'),
    COMPLETE: opsTranslate('filterComplete'),
    UNPAID: opsTranslate('filterUnpaid'),
    KICKED: opsTranslate('filterKicked'),
    DISCIPLINED: opsTranslate('filterDisciplined'),
  };
  const defaultKickReason = opsTranslate('defaultKickReason');
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ParticipantFilter>('ALL');
  const [kickDraft, setKickDraft] = useState<KickDraft | null>(null);
  const [kickReason, setKickReason] = useState(defaultKickReason);

  const filteredParticipants = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesFilter =
        filter === 'ALL' ? true :
        filter === 'COMPLETE' ? isParticipantApproved(participant.teamStatus) :
        filter === 'UNPAID' ? !participant.isPaid :
        filter === 'KICKED' ? participant.teamStatus === 'KICKED' :
        participant.teamStatus === 'DISQUALIFIED' || participant.teamStatus === 'NO_SHOW' || participant.teamStatus === 'WITHDRAWN';

      const matchesSearch =
        !normalizedSearch ||
        participant.teamName.toLowerCase().includes(normalizedSearch) ||
        (participant.members || []).some((member) => (member.fullName || '').toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [filter, participants, search]);

  const summary = useMemo(() => {
    return {
      total: participants.length,
      active: participants.filter((participant) => isParticipantApproved(participant.teamStatus)).length,
      unpaid: participants.filter((participant) => !participant.isPaid).length,
      disciplined: participants.filter((participant) => participant.teamStatus === 'DISQUALIFIED' || participant.teamStatus === 'NO_SHOW' || participant.teamStatus === 'WITHDRAWN').length,
      kicked: participants.filter((participant) => participant.teamStatus === 'KICKED').length,
    };
  }, [participants]);

  const handleSubmitKick = async () => {
    if (!kickDraft) {
      return;
    }

    await onKickParticipant(kickDraft.id, kickReason);
    setKickDraft(null);
    setKickReason(defaultKickReason);
  };

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{opsTranslate('rosterTitle')}</h2>
            <p className="text-sm font-medium text-slate-500">{opsTranslate('rosterDescription')}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{opsTranslate('boundaryTitle')}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{opsTranslate('boundaryDescription')}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={opsTranslate('searchPlaceholder')}
            icon={<Search className="h-4 w-4" />}
          />
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-full border px-3 py-2 text-xs font-bold transition-colors',
                  filter === value
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
                )}
              >
                {filterLabels[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{opsTranslate('summaryTotal')}</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{opsTranslate('summaryActive')}</p>
            <p className="mt-2 text-lg font-bold text-emerald-700">{summary.active}</p>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose-600">{opsTranslate('summaryUnpaid')}</p>
            <p className="mt-2 text-lg font-bold text-rose-700">{summary.unpaid}</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">{opsTranslate('summaryDisciplined')}</p>
            <p className="mt-2 text-lg font-bold text-amber-700">{summary.disciplined}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">{opsTranslate('summaryKicked')}</p>
            <p className="mt-2 text-lg font-bold text-amber-700">{summary.kicked}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                <th className="pb-3 pr-4">{opsTranslate('tableTeam')}</th>
                <th className="pb-3 pr-4">{opsTranslate('tableMembers')}</th>
                <th className="pb-3 pr-4">{opsTranslate('tableStatus')}</th>
                <th className="pb-3 pr-4">{opsTranslate('tablePayment')}</th>
                <th className="pb-3 text-right">{opsTranslate('tableActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12">
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <Users className="h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-700">{opsTranslate('emptyTitle')}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{opsTranslate('emptyHint')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => {
                  const isBusy = activeParticipantActionId === participant.id;
                  const canKick = participant.teamStatus !== 'KICKED' && participant.teamStatus !== 'WITHDRAWN' && participant.teamStatus !== 'COMPLETE';

                  return (
                    <tr key={participant.id}>
                      <td className="py-4 pr-4">
                        <p className="text-sm font-bold text-slate-900">{participant.teamName}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {opsTranslate('registrationDateSeed', { date: formatDate(participant.registeredAt), seed: participant.seed ?? opsTranslate('noSeed') })}
                        </p>
                      </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {(participant.members || []).map((member) => (
                              <span key={member.userId} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                                {member.isMock ? opsTranslate('virtualPlayerShort') : (member.fullName || opsTranslate('unknownMemberShort'))}
                              </span>
                            ))}
                          </div>
                        </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getParticipantStatusClassName(participant.teamStatus)}`}>
                          {getParticipantStatusLabel(participant.teamStatus, participantStatusLabels)}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`text-xs font-bold ${participant.isPaid ? 'text-blue-600' : 'text-blue-600'}`}>
                          {participant.isPaid ? opsTranslate('paid') : opsTranslate('unpaid')}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 font-bold text-slate-700"
                              disabled={isBusy}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{opsTranslate('operationsAction')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!canKick || isBusy}
                              onClick={() => {
                                setKickDraft({ id: participant.id, teamName: participant.teamName });
                                setKickReason(defaultKickReason);
                              }}
                            >
                              <ShieldAlert className="mr-2 h-4 w-4 text-rose-600" />
                              {opsTranslate('kickAction')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(kickDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setKickDraft(null);
          }
        }}
      >
        <ModalContent className="sm:max-w-xl">
          <ModalHeader>
            <ModalTitle>{opsTranslate('kickModalTitle')}</ModalTitle>
            <ModalDescription>{opsTranslate('kickModalDescription')}</ModalDescription>
          </ModalHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{opsTranslate('targetLabel')}</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{kickDraft?.teamName}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="kick-reason" className="text-sm font-bold text-slate-700">
                {opsTranslate('kickReasonLabel')}
              </label>
              <textarea
                id="kick-reason"
                value={kickReason}
                onChange={(event) => setKickReason(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder={opsTranslate('kickReasonPlaceholder')}
              />
            </div>
          </div>

          <ModalFooter className="gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => setKickDraft(null)}>
              {opsTranslate('cancelAction')}
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                void handleSubmitKick();
              }}
              disabled={!kickReason.trim() || activeParticipantActionId === kickDraft?.id}
            >
              {opsTranslate('confirmKick')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
