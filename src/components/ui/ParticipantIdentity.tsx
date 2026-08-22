export interface ParticipantMemberPreview {
  userId: string;
  fullName: string | null;
  avatarUrl?: string | null;
}

export interface ParticipantIdentityData {
  teamName: string;
  logoUrl?: string | null;
  members?: ParticipantMemberPreview[];
}

interface ParticipantIdentityProps {
  participant?: ParticipantIdentityData | null;
  fallback: string;
  align?: 'left' | 'right';
  compact?: boolean;
}

const getInitial = (name: string | null | undefined, fallback: string) =>
  (name?.trim().charAt(0) || fallback.trim().charAt(0) || '?').toUpperCase();

const getLastNameWord = (name: string | null | undefined): string => {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return words.at(-1) ?? '';
};

export function ParticipantIdentity({
  participant,
  fallback,
  align = 'left',
  compact = false,
}: ParticipantIdentityProps) {
  const availableMembers = (participant?.members ?? []).filter((member) => member.fullName || member.avatarUrl);
  const members = availableMembers.length <= 2 ? availableMembers : [];
  const isRight = align === 'right';
  const displayName = members.length === 2
    ? members.map((member) => getLastNameWord(member.fullName)).filter(Boolean).join(' / ')
    : participant?.teamName || fallback;
  const avatarSize = compact ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]';

  return (
    <div className={`flex min-w-0 items-center gap-2 ${isRight ? 'flex-row-reverse text-right' : 'text-left'}`}>
      <div className={`flex shrink-0 items-center ${isRight ? 'flex-row-reverse' : ''}`} aria-label={displayName}>
        {members.length > 0 ? (
          members.map((member, index) => (
            <span
              key={member.userId}
              className={`${avatarSize} relative flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 font-bold text-slate-500 shadow-sm ${index > 0 ? '-ml-2' : ''}`}
              title={member.fullName || undefined}
            >
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt={member.fullName || ''} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                getInitial(member.fullName, fallback)
              )}
            </span>
          ))
        ) : (
          <span className={`${avatarSize} relative flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 font-bold text-slate-500 shadow-sm`}>
            {participant?.logoUrl ? (
              <img src={participant.logoUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            ) : (
              getInitial(participant?.teamName, fallback)
            )}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className={`${compact ? 'text-[10px]' : 'text-xs'} block truncate font-bold text-slate-800`} title={displayName}>
          {displayName}
        </div>

      </div>
    </div>
  );
}

export default ParticipantIdentity;

