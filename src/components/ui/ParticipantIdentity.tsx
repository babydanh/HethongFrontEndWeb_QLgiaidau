import React from 'react';

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

/**
 * Format 1 tên cá nhân: Nếu có >= 3 từ thì lấy 2 từ cuối (VD: "Trần Minh Quân" -> "Minh Quân")
 */
const formatSingleShortName = (singleName: string): string => {
  const words = singleName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) {
    return words.join(' ');
  }
  return words.slice(-2).join(' ');
};

/**
 * Rút gọn tên hiển thị (Hỗ trợ cả tên đơn và tên đôi nối bằng " / " hoặc " - ")
 */
export const formatShortPersonName = (name: string | null | undefined): string => {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  if (trimmed.includes(' / ')) {
    return trimmed
      .split(' / ')
      .map((part) => formatSingleShortName(part))
      .filter(Boolean)
      .join(' / ');
  }

  if (trimmed.includes(' - ')) {
    return trimmed
      .split(' - ')
      .map((part) => formatSingleShortName(part))
      .filter(Boolean)
      .join(' - ');
  }

  return formatSingleShortName(trimmed);
};

/**
 * Lấy chữ cái đầu của TÊN CHÍNH (từ cuối cùng, VD: "Trần Minh Quân" -> "Q", "Nguyễn Khánh Duy" -> "D")
 */
const getInitial = (name: string | null | undefined, fallback: string): string => {
  if (!name || !name.trim()) {
    return (fallback.trim().charAt(0) || '?').toUpperCase();
  }
  const words = name.trim().split(/\s+/).filter(Boolean);
  const targetWord = words.at(-1) || words[0] || '?';
  return targetWord.charAt(0).toUpperCase();
};

export function ParticipantIdentity({
  participant,
  fallback,
  align = 'left',
  compact = false,
}: ParticipantIdentityProps) {
  const availableMembers = (participant?.members ?? []).filter(
    (member) => member.fullName || member.avatarUrl
  );
  const members = availableMembers.length <= 2 ? availableMembers : [];
  const isRight = align === 'right';

  // Định dạng tên 2 chữ cuối cho cả 2 bên
  const displayName =
    members.length === 2
      ? members
          .map((member) => formatShortPersonName(member.fullName) || member.fullName)
          .filter(Boolean)
          .join(' / ')
      : members.length === 1 && members[0].fullName
        ? formatShortPersonName(members[0].fullName) || members[0].fullName
        : formatShortPersonName(participant?.teamName) || fallback;

  const avatarSize = compact ? 'h-6 w-6 text-[9px]' : 'h-7.5 w-7.5 text-[10px]';

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${
        isRight ? 'flex-row-reverse text-right' : 'text-left'
      }`}
    >
      {/* Container chứa Avatar / Logo: Giữ nguyên thứ tự xếp chồng -space-x-1.5 để cả 2 bên đều đè lên nhau chuẩn xác */}
      <div className="flex shrink-0 items-center -space-x-1.5" aria-label={displayName}>
        {members.length > 0 ? (
          members.map((member, index) => (
            <span
              key={member.userId || index}
              className={`${avatarSize} relative flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 font-bold text-slate-600 shadow-xs ring-1 ring-slate-200/50 shrink-0`}
              style={{ zIndex: 10 - index }}
              title={member.fullName || undefined}
            >
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.fullName || ''}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitial(member.fullName, fallback)
              )}
            </span>
          ))
        ) : (
          <span
            className={`${avatarSize} relative flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 font-bold text-slate-600 shadow-xs ring-1 ring-slate-200/50 shrink-0`}
          >
            {participant?.logoUrl ? (
              <img
                src={participant.logoUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              getInitial(participant?.teamName, fallback)
            )}
          </span>
        )}
      </div>

      {/* Tên vận động viên / Đội */}
      <div className="min-w-0">
        <div
          className={`${
            compact ? 'text-[10px]' : 'text-xs'
          } block truncate font-bold text-slate-800`}
          title={displayName}
        >
          {displayName}
        </div>
      </div>
    </div>
  );
}

export default ParticipantIdentity;
