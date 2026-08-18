'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BarChart3, CheckCircle2, Circle, CheckSquare2, Square, Plus, Loader2, Users } from 'lucide-react';
import type { CommunityPoll, CommunityPollOption } from '@/types/community-social';
import { communitiesApi } from '@/features/communities/api';
import { tournamentsApi } from '@/features/tournaments/api';
import toast from 'react-hot-toast';
import { useUserProfileModalStore } from '@/lib/zustand/userProfileModalStore';
import { useAuthStore } from '@/lib/zustand/authStore';
import { cn } from '@/utils/cn';

interface CommunityPollCardProps {
  communityId: string;
  poll: CommunityPoll;
  tournamentInviteCode?: string | null;
  onPollUpdated?: (updatedPoll: CommunityPoll) => void;
}

export default function CommunityPollCard({
  communityId,
  poll,
  tournamentInviteCode,
  onPollUpdated,
}: CommunityPollCardProps) {
  const { user } = useAuthStore();
  const { openUserProfile } = useUserProfileModalStore();
  const [currentPoll, setCurrentPoll] = useState<CommunityPoll>(poll);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const [isSubmittingOption, setIsSubmittingOption] = useState(false);
  const [isClosingPoll, setIsClosingPoll] = useState(false);
  const [selectedOptionForVoters, setSelectedOptionForVoters] = useState<CommunityPollOption | null>(null);

  const totalVotes = currentPoll.options.reduce((acc, opt) => acc + opt.voteCount, 0);
  const isExpired = currentPoll.isClosed || (currentPoll.expiresAt && new Date(currentPoll.expiresAt) < new Date());
  const canClosePoll = !currentPoll.isClosed && user?.id && currentPoll.creatorId === user.id;

  const handleVote = async (optionId: string) => {
    if (isExpired) return;
    try {
      setVotingOptionId(optionId);
      const res = await communitiesApi.votePoll(communityId, currentPoll.id, optionId);
      if (res.data) {
        setCurrentPoll(res.data);
        onPollUpdated?.(res.data);
        const selected = res.data.options.find((option: CommunityPollOption) => option.id === optionId);
        const shouldRegister = selected?.isVoted === true && tournamentInviteCode && (
          selected.optionText.includes('Có tham gia') ||
          selected.optionText.includes('Đăng ký') ||
          selected.optionText.includes('✅')
        );
        if (shouldRegister) {
          try {
            await tournamentsApi.joinLite(tournamentInviteCode);
            toast.success('Đã bình chọn và đăng ký tham gia giải.');
          } catch {
            toast('Đã ghi nhận bình chọn. Bạn có thể đã đăng ký giải này trước đó.');
          }
        }
      }
    } catch (err) {
      console.error('Failed to vote poll:', err);
    } finally {
      setVotingOptionId(null);
    }
  };

  const handleClosePollEarly = async () => {
    if (!window.confirm('Bạn có chắc muốn kết thúc cuộc bình chọn này sớm không?')) return;
    try {
      setIsClosingPoll(true);
      const res = await communitiesApi.closePoll(communityId, currentPoll.id);
      if (res.data) {
        setCurrentPoll(res.data);
        onPollUpdated?.(res.data);
      }
    } catch (err) {
      console.error('Failed to close poll:', err);
    } finally {
      setIsClosingPoll(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionText.trim() || isSubmittingOption) return;
    try {
      setIsSubmittingOption(true);
      const res = await communitiesApi.addPollOption(communityId, currentPoll.id, newOptionText.trim());
      if (res.data) {
        setCurrentPoll(res.data);
        onPollUpdated?.(res.data);
        setNewOptionText('');
        setIsAddingOption(false);
      }
    } catch (err) {
      console.error('Failed to add poll option:', err);
    } finally {
      setIsSubmittingOption(false);
    }
  };

  const sortedOptions = [...currentPoll.options].sort((a, b) => {
    const getScore = (text: string) => {
      if (text.includes('Có tham gia') || text.includes('Đăng ký') || text.includes('✅')) return 1;
      if (text.includes('Chưa chắc chắn') || text.includes('suy nghĩ') || text.includes('⏳')) return 2;
      if (text.includes('Không') || text.includes('Bận') || text.includes('❌')) return 3;
      return 2;
    };
    return getScore(a.optionText) - getScore(b.optionText);
  });

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-blue-100 bg-slate-50/60 p-4 shadow-xs">
      {/* Header: Question + Mode Badge + Expiration / Close Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-blue-600">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Thăm dò ý kiến</span>
            {currentPoll.allowMultipleAnswers ? (
              <span className="rounded bg-blue-100/70 px-1.5 py-0.5 text-[10px] text-blue-700">Chọn nhiều</span>
            ) : (
              <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-slate-700">Chọn một</span>
            )}

            {isExpired ? (
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Đã kết thúc</span>
            ) : currentPoll.expiresAt ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                Hết hạn: {new Date(currentPoll.expiresAt).toLocaleDateString('vi-VN')}
              </span>
            ) : null}
          </div>
          <h4 className="text-sm font-bold text-slate-900 leading-snug">{currentPoll.question}</h4>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {totalVotes} lượt bình chọn
          </span>
          {canClosePoll && (
            <button
              type="button"
              disabled={isClosingPoll}
              onClick={handleClosePollEarly}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
            >
              {isClosingPoll ? 'Đang kết thúc...' : 'Kết thúc sớm'}
            </button>
          )}
        </div>
      </div>

      {/* Options List */}
      <div className="mt-3.5 space-y-2">
        {sortedOptions.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
          const isVotingThis = votingOptionId === option.id;

          return (
            <div
              key={option.id}
              onClick={() => handleVote(option.id)}
              className={cn(
                'group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-lg border p-3 transition-all select-none',
                option.isVoted
                  ? 'border-blue-500 bg-blue-50/40 text-blue-950 font-bold'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
              )}
            >
              {/* Progress bar fill */}
              <div
                className={cn(
                  'absolute inset-y-0 left-0 transition-all duration-500 ease-out',
                  option.isVoted ? 'bg-blue-500/15' : 'bg-slate-200/40'
                )}
                style={{ width: `${percentage}%` }}
              />

              {/* Left: Check Icon + Option Text */}
              <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                {isVotingThis ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                ) : currentPoll.allowMultipleAnswers ? (
                  option.isVoted ? (
                    <CheckSquare2 className="h-4 w-4 shrink-0 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-400" />
                  )
                ) : option.isVoted ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-400" />
                )}
                <span className="truncate text-xs font-semibold">{option.optionText}</span>
              </div>

              {/* Right: Voter Avatar Stack + Percentage */}
              <div className="relative z-10 flex shrink-0 items-center gap-2">
                {/* Facebook style Avatar Stack */}
                {option.voters && option.voters.length > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOptionForVoters(option);
                    }}
                    className="flex items-center -space-x-1.5 hover:opacity-80 transition-opacity"
                    title="Xem người đã chọn"
                  >
                    {option.voters.slice(0, 3).map((voter) => (
                      <div
                        key={voter.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          openUserProfile(
                            {
                              id: voter.id,
                              fullName: voter.fullName,
                              avatarUrl: voter.avatarUrl,
                            },
                            rect,
                            communityId,
                          );
                        }}
                        className="relative h-5 w-5 overflow-hidden rounded-full border border-white bg-slate-100 shadow-2xs cursor-pointer"
                      >
                        {voter.avatarUrl ? (
                          <Image src={voter.avatarUrl} alt={voter.fullName} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-blue-100 text-[8px] font-bold text-blue-600 uppercase">
                            {voter.fullName.substring(0, 1)}
                          </div>
                        )}
                      </div>
                    ))}
                    {option.voters.length > 3 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-200 text-[9px] font-bold text-slate-600 shadow-2xs">
                        +{option.voters.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <span className="min-w-[36px] text-right text-xs font-bold text-slate-600">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Option Input or Button */}
      {currentPoll.allowAddOptions && !currentPoll.isClosed && (
        <div className="mt-3">
          {isAddingOption ? (
            <form onSubmit={handleAddOption} className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập lựa chọn của bạn..."
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                autoFocus
                className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={isSubmittingOption || !newOptionText.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingOption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Thêm'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingOption(false);
                  setNewOptionText('');
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingOption(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm lựa chọn</span>
            </button>
          )}
        </div>
      )}

      {/* Modal / Dialog xem danh sách người đã vote cho một option */}
      {selectedOptionForVoters && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4"
          onClick={() => setSelectedOptionForVoters(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Người đã bình chọn</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOptionForVoters(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
              >
                Đóng
              </button>
            </div>

            <p className="mt-2 text-xs font-medium text-slate-500 italic">
              &quot;{selectedOptionForVoters.optionText}&quot; ({selectedOptionForVoters.voteCount} lượt)
            </p>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {selectedOptionForVoters.voters.map((voter) => (
                <div
                  key={voter.id}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    openUserProfile(
                      {
                        id: voter.id,
                        fullName: voter.fullName,
                        avatarUrl: voter.avatarUrl,
                      },
                      rect,
                      communityId,
                    );
                  }}
                  className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shrink-0">
                    {voter.avatarUrl ? (
                      <Image src={voter.avatarUrl} alt={voter.fullName} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-blue-50 text-xs font-bold text-blue-600 uppercase">
                        {voter.fullName.substring(0, 1)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">{voter.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
