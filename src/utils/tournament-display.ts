export const getDivisionMatchLabel = (matchType?: string | null, genderRestriction?: string | null) => {
  const genderLabel =
    genderRestriction === 'MALE' ? 'Nam' :
    genderRestriction === 'FEMALE' ? 'Nữ' :
    genderRestriction === 'MIXED' ? 'Nam Nữ' :
    '';

  if (matchType === 'SINGLES') {
    return `Đơn ${genderLabel}`.trim();
  }

  if (matchType === 'MIXED_DOUBLES') {
    return 'Đôi Nam Nữ';
  }

  if (matchType === 'DOUBLES') {
    return `Đôi ${genderLabel}`.trim();
  }

  return 'Chưa rõ hình thức';
};

export const getDivisionBracketLabel = (bracketType?: string | null) => {
  if (bracketType === 'SINGLE_ELIMINATION') {
    return 'Loại trực tiếp';
  }

  if (bracketType === 'DOUBLE_ELIMINATION') {
    return 'Nhánh thắng/thua';
  }

  if (bracketType === 'ROUND_ROBIN') {
    return 'Vòng tròn tính điểm';
  }

  return 'Chưa cấu hình bracket';
};

export const getParticipantStatusLabel = (status?: string | null) => {
  if (status === 'COMPLETE') {
    return 'Đã duyệt';
  }

  if (status === 'PENDING_PARTNER') {
    return 'Chờ đồng đội';
  }

  if (status === 'PENDING_APPROVAL') {
    return 'Chờ duyệt';
  }

  if (status === 'PENDING') {
    return 'Chờ duyệt';
  }

  if (status === 'WAITLISTED') {
    return 'Hàng chờ';
  }

  if (status === 'REJECTED') {
    return 'Đã từ chối';
  }

  if (status === 'WITHDRAWN') {
    return 'Đã rút';
  }

  if (status === 'KICKED') {
    return 'Đã loại';
  }

  if (status === 'DISQUALIFIED') {
    return 'Bị truất quyền';
  }

  if (status === 'NO_SHOW') {
    return 'Vắng mặt';
  }

  if (status === 'REPLACED') {
    return 'Đã thay thế';
  }

  return 'Chưa rõ';
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
  if (isParticipantApproved(status)) {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (isParticipantPendingApproval(status)) {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  if (isParticipantPendingPartner(status)) {
    return 'border-blue-100 bg-blue-50 text-blue-700';
  }

  if (isParticipantWaitlisted(status)) {
    return 'border-blue-100 bg-blue-50 text-blue-700';
  }

  if (status === 'REJECTED') {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  if (status === 'KICKED') {
    return 'border-rose-100 bg-rose-50 text-rose-700';
  }

  if (status === 'DISQUALIFIED') {
    return 'border-rose-100 bg-rose-50 text-rose-700';
  }

  if (status === 'WITHDRAWN') {
    return 'border-slate-200 bg-slate-100 text-slate-600';
  }

  return 'border-slate-200 bg-slate-100 text-slate-600';
};

