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

  if (status === 'PENDING') {
    return 'Chờ duyệt';
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
