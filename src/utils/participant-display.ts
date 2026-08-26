export type ParticipantMemberIdentity = {
  userId?: string | null;
  fullName?: string | null;
};

/**
 * Keep one display record per athlete while preserving two different athletes
 * who happen to share the same name. Some legacy participant payloads contain
 * the same member more than once, which makes doubles cards repeat names and
 * avatars.
 */
export function getUniqueParticipantMembers<T extends ParticipantMemberIdentity>(
  members: readonly T[] | null | undefined,
): T[] {
  const seenUserIds = new Set<string>();
  const seenNamelessNames = new Set<string>();

  return (members ?? []).filter((member) => {
    const userId = member.userId?.trim();
    if (userId) {
      if (seenUserIds.has(userId)) return false;
      seenUserIds.add(userId);
      return true;
    }

    const normalizedName = member.fullName?.trim().toLocaleLowerCase();
    if (normalizedName) {
      if (seenNamelessNames.has(normalizedName)) return false;
      seenNamelessNames.add(normalizedName);
    }

    return true;
  });
}
