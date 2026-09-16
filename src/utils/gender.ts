export type ProfileGender = 'MALE' | 'FEMALE' | 'OTHER';

const aliases: Record<ProfileGender, readonly string[]> = {
  MALE: ['MALE', 'MEN', 'NAM', 'M'],
  FEMALE: ['FEMALE', 'WOMEN', 'NU', 'NỮ', 'F'],
  OTHER: ['OTHER', 'OTHERS', 'KHAC', 'KHÁC'],
};

export function normalizeProfileGender(value?: unknown): ProfileGender | null {
  const token = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[-–\s]+/g, '_');

  for (const gender of Object.keys(aliases) as ProfileGender[]) {
    if (aliases[gender].includes(token)) return gender;
  }
  return null;
}
