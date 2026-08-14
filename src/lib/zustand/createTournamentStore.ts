import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MatchTypeDB, GenderRestriction, type SportRulesEnvelope } from '@/types/tournament';

// UI-level combined match format (matchType + gender in one pick)
export type MatchFormat =
  | 'MALE_SINGLES'
  | 'FEMALE_SINGLES'
  | 'MALE_DOUBLES'
  | 'FEMALE_DOUBLES'
  | 'MIXED_DOUBLES';

// Map UI matchFormat → backend fields
export function resolveMatchFormat(format: MatchFormat): {
  matchType: MatchTypeDB;
  genderRestriction: GenderRestriction;
  divisionName: string;
} {
  switch (format) {
    case 'MALE_SINGLES':
      return { matchType: MatchTypeDB.SINGLES, genderRestriction: GenderRestriction.MALE, divisionName: 'Đơn Nam' };
    case 'FEMALE_SINGLES':
      return { matchType: MatchTypeDB.SINGLES, genderRestriction: GenderRestriction.FEMALE, divisionName: 'Đơn Nữ' };
    case 'MALE_DOUBLES':
      return { matchType: MatchTypeDB.DOUBLES, genderRestriction: GenderRestriction.MALE, divisionName: 'Đôi Nam' };
    case 'FEMALE_DOUBLES':
      return { matchType: MatchTypeDB.DOUBLES, genderRestriction: GenderRestriction.FEMALE, divisionName: 'Đôi Nữ' };
    case 'MIXED_DOUBLES':
      return { matchType: MatchTypeDB.MIXED_DOUBLES, genderRestriction: GenderRestriction.MIXED, divisionName: 'Đôi Nam Nữ' };
  }
}

interface TournamentFormData {
  // Step 1: Info
  name: string;
  description: string;
  categoryId: string;
  communityId: string;
  tournamentType: 'CLUB' | 'PUBLIC';
  visibility: 'PUBLIC' | 'PRIVATE';
  // UI-only: unified match format (for single format backward compatibility)
  matchFormat: MatchFormat;
  // Step 2: Multiple formats
  selectedFormats: MatchFormat[];
  minElo: number | null;
  maxElo: number | null;
  maxCombinedElo: number | null;
  maxTeammateGap: number | null;
  // Step 2: Format & rules
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN' | 'GROUP_STAGE_KNOCKOUT';
  maxParticipants: number | null;
  sportRules: SportRulesEnvelope;
  // Step 4: Schedule & Venue
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  venueId: string;
  // Step 5: Fees
  entryFee: number;
  isRanked: boolean;
  registrationMode: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY';
  // Team sport (bóng đá): sân 5/7/11 + thể thức nâng cao
  teamSize?: 5 | 7 | 11;
  teamSizeOptions?: Array<5 | 7 | 11>;
  minTeamSize?: number;
  maxTeamSize?: number;
  maxReserve?: number;
  twoLegged?: boolean;
  awayGoalsRule?: boolean;
  penaltyShootout?: boolean;
  allowDraw?: boolean;
  // Football team eligibility: null/open means no gender restriction.
  footballGenderRestriction?: 'MALE' | 'FEMALE' | null;
}

interface CreateTournamentState {
  currentStep: number;
  formData: TournamentFormData;
  validationTarget?: { step: number; field: string; message: string; nonce: number };
  setStep: (step: number) => void;
  setValidationTarget: (target: { step: number; field: string; message: string }) => void;
  clearValidationTarget: () => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<TournamentFormData>) => void;
  getDivisionsFromFormats: () => Array<{ matchType: MatchTypeDB; genderRestriction: GenderRestriction | null; name: string }>;
  reset: () => void;
}

const defaultFormData: TournamentFormData = {
  name: '',
  description: '',
  categoryId: '',
  communityId: '',
  tournamentType: 'PUBLIC',
  visibility: 'PUBLIC',
  matchFormat: 'MALE_DOUBLES',
  selectedFormats: [],
  minElo: null,
  maxElo: null,
  maxCombinedElo: null,
  maxTeammateGap: null,
  format: 'SINGLE_ELIMINATION',
  maxParticipants: null,
  // Rules are derived after a sport is selected; never seed a new draft as badminton.
  sportRules: {},
  startDate: '',
  endDate: '',
  registrationStartDate: '',
  registrationEndDate: '',
  venueId: '',
  entryFee: 0,
  isRanked: true,
  registrationMode: 'OPEN',
  footballGenderRestriction: null,
};

type PersistedCreateTournamentState = Partial<Omit<CreateTournamentState, 'formData'>> & {
  formData?: Partial<TournamentFormData>;
};

const normalizeFormData = (formData?: Partial<TournamentFormData>): TournamentFormData => ({
  ...defaultFormData,
  ...formData,
  sportRules: formData?.sportRules ?? defaultFormData.sportRules,
  matchFormat: formData?.matchFormat ?? defaultFormData.matchFormat,
  selectedFormats: Array.isArray(formData?.selectedFormats) ? formData.selectedFormats : [],
  registrationMode: formData?.registrationMode ?? defaultFormData.registrationMode,
  visibility: formData?.visibility ?? defaultFormData.visibility,
});

export const useCreateTournamentStore = create<CreateTournamentState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      formData: defaultFormData,
      validationTarget: undefined,
      setStep: (step) => set({ currentStep: step }),
      setValidationTarget: (target) => set({ validationTarget: { ...target, nonce: Date.now() } }),
      clearValidationTarget: () => set({ validationTarget: undefined }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      updateFormData: (data) =>
        set((state) => ({
          formData: normalizeFormData({ ...state.formData, ...data }),
        })),
      getDivisionsFromFormats: () => {
        const state = get();
        const formData = normalizeFormData(state.formData);
        const isFootball = formData.sportRules?.kind === 'FOOTBALL';
        if (isFootball) {
          const rawRestriction = formData.footballGenderRestriction;
          const genderRestriction: GenderRestriction | null = rawRestriction === 'MALE'
            ? GenderRestriction.MALE
            : rawRestriction === 'FEMALE'
              ? GenderRestriction.FEMALE
              : null;
          const name = genderRestriction === GenderRestriction.MALE
            ? 'Bóng đá Nam'
            : genderRestriction === GenderRestriction.FEMALE
              ? 'Bóng đá Nữ'
              : 'Bóng đá Mở rộng';
          return [{
            matchType: MatchTypeDB.DOUBLES,
            genderRestriction,
            name,
          }];
        }
        const formats = formData.selectedFormats.length > 0
          ? formData.selectedFormats
          : [formData.matchFormat];
        
        return formats.map((format) => {
          const resolved = resolveMatchFormat(format);
          return {
            matchType: resolved.matchType,
            genderRestriction: resolved.genderRestriction,
            name: resolved.divisionName,
          };
        });
      },
      reset: () => set({ currentStep: 1, formData: defaultFormData, validationTarget: undefined }),
    }),
    {
      name: 'create-tournament-storage-v2',
      version: 3,
      migrate: (persistedState) => {
        const persisted = persistedState as PersistedCreateTournamentState | undefined;

        return {
          currentStep: persisted?.currentStep ?? 1,
          formData: normalizeFormData(persisted?.formData),
        };
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedCreateTournamentState | undefined;

        return {
          ...currentState,
          ...persisted,
          formData: normalizeFormData(persisted?.formData),
        };
      },
    }
  )
);
