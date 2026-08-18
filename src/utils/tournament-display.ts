export type TournamentDisplayLabels = {
  maleGender?: string;
  femaleGender?: string;
  mixedGender?: string;
  singlesFormat?: string;
  doublesFormat?: string;
  mixedDoublesFormat?: string;
  unknownFormat?: string;
  bracketSingleElimination?: string;
  bracketDoubleElimination?: string;
  bracketRoundRobin?: string;
  bracketGroupStageKnockout?: string;
  unknownBracket?: string;
  participantComplete?: string;
  participantPendingPartner?: string;
  participantPendingApproval?: string;
  participantWaitlisted?: string;
  participantRejected?: string;
  participantWithdrawn?: string;
  participantKicked?: string;
  participantDisqualified?: string;
  participantNoShow?: string;
  participantReplaced?: string;
  unknownParticipant?: string;
};

const formatGenderTemplate = (template: string, genderLabel: string) =>
  template.replace('{gender}', genderLabel).replace(/\s+/g, ' ').trim();

export const getDivisionMatchLabel = (
  matchType?: string | null,
  genderRestriction?: string | null,
  labels?: TournamentDisplayLabels,
 ) => {
  const genderLabel =
    genderRestriction === 'MALE' ? (labels?.maleGender ?? 'Nam') :
    genderRestriction === 'FEMALE' ? (labels?.femaleGender ?? 'Nữ') :
    genderRestriction === 'MIXED' ? (labels?.mixedGender ?? 'Nam Nữ') :
    '';

  if (matchType === 'SINGLES') {
    return formatGenderTemplate(labels?.singlesFormat ?? 'Đơn {gender}', genderLabel);
  }

  if (matchType === 'MIXED_DOUBLES') {
    return labels?.mixedDoublesFormat ?? 'Đôi Nam Nữ';
  }

  if (matchType === 'DOUBLES') {
    return formatGenderTemplate(labels?.doublesFormat ?? 'Đôi {gender}', genderLabel);
  }

  return labels?.unknownFormat ?? 'Chưa rõ hình thức';
};

export const getDivisionBracketLabel = (bracketType?: string | null, labels?: TournamentDisplayLabels) => {
  if (bracketType === 'SINGLE_ELIMINATION') {
    return labels?.bracketSingleElimination ?? 'Loại trực tiếp';
  }

  if (bracketType === 'DOUBLE_ELIMINATION') {
    return labels?.bracketDoubleElimination ?? 'Nhánh thắng/thua';
  }

  if (bracketType === 'ROUND_ROBIN') {
    return labels?.bracketRoundRobin ?? 'Vòng tròn tính điểm';
  }

  if (bracketType === 'GROUP_STAGE_KNOCKOUT') {
    return labels?.bracketGroupStageKnockout ?? 'Vòng bảng + loại trực tiếp';
  }

  return labels?.unknownBracket ?? 'Chưa cấu hình bracket';
};

export const getParticipantStatusLabel = (status?: string | null, labels?: TournamentDisplayLabels) => {
  if (status === 'COMPLETE') return labels?.participantComplete ?? 'Đã duyệt';
  if (status === 'PENDING_PARTNER') return labels?.participantPendingPartner ?? 'Chờ đồng đội';
  if (status === 'PENDING_APPROVAL' || status === 'PENDING') return labels?.participantPendingApproval ?? 'Chờ duyệt';
  if (status === 'WAITLISTED') return labels?.participantWaitlisted ?? 'Hàng chờ';
  if (status === 'REJECTED') return labels?.participantRejected ?? 'Đã từ chối';
  if (status === 'WITHDRAWN') return labels?.participantWithdrawn ?? 'Đã rút';
  if (status === 'KICKED') return labels?.participantKicked ?? 'Đã loại';
  if (status === 'DISQUALIFIED') return labels?.participantDisqualified ?? 'Bị truất quyền';
  if (status === 'NO_SHOW') return labels?.participantNoShow ?? 'Vắng mặt';
  if (status === 'REPLACED') return labels?.participantReplaced ?? 'Đã thay thế';
  return labels?.unknownParticipant ?? 'Chưa rõ';
};

export const isParticipantApproved = (status?: string | null) =>
  status === 'COMPLETE';

export const isParticipantPendingApproval = (status?: string | null) =>
  status === 'PENDING_APPROVAL' || status === 'PENDING';

export const isParticipantPendingPartner = (status?: string | null) =>
  status === 'PENDING_PARTNER';

export const isParticipantWaitlisted = (status?: string | null) =>
  status === 'WAITLISTED';

export const isParticipantReadyForNextStep = (status?: string | null) =>
  isParticipantApproved(status) || isParticipantPendingApproval(status);

export const getParticipantStatusClassName = (status?: string | null) => {
  if (isParticipantApproved(status)) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (isParticipantPendingApproval(status)) return 'border-amber-100 bg-amber-50 text-amber-700';
  if (isParticipantPendingPartner(status)) return 'border-blue-100 bg-blue-50 text-blue-700';
  if (isParticipantWaitlisted(status)) return 'border-blue-100 bg-blue-50 text-blue-700';
  if (status === 'REJECTED') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (status === 'KICKED' || status === 'DISQUALIFIED') return 'border-rose-100 bg-rose-50 text-rose-700';
  if (status === 'WITHDRAWN') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-slate-200 bg-slate-100 text-slate-600';
};