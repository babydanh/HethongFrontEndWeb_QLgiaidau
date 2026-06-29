import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MatchTypeDB, GenderRestriction, type SportRulesEnvelope } from '@/types/tournament';
import { buildDefaultSportRules } from '@/features/tournaments/sport-rules/defaults';

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
  // UI-only: unified match format (for single format backward compatibility)
  matchFormat: MatchFormat;
  // Step 2: Multiple formats
  selectedFormats: MatchFormat[];
  minElo: number | null;
  maxElo: number | null;
  maxCombinedElo: number | null;
  maxTeammateGap: number | null;
  // Step 3: Format & rules
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';
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
}

interface CreateTournamentState {
  currentStep: number;
  formData: TournamentFormData;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<TournamentFormData>) => void;
  getDivisionsFromFormats: () => Array<{ matchType: MatchTypeDB; genderRestriction: GenderRestriction; name: string }>;
  reset: () => void;
}

const defaultFormData: TournamentFormData = {
  name: '',
  description: '',
  categoryId: '',
  communityId: '',
  tournamentType: 'PUBLIC',
  matchFormat: 'MALE_DOUBLES',
  selectedFormats: [],
  minElo: null,
  maxElo: null,
  maxCombinedElo: null,
  maxTeammateGap: null,
  format: 'SINGLE_ELIMINATION',
  maxParticipants: null,
  sportRules: buildDefaultSportRules('BADMINTON'),
  startDate: '',
  endDate: '',
  registrationStartDate: '',
  registrationEndDate: '',
  venueId: '',
  entryFee: 0,
  isRanked: true,
  registrationMode: 'OPEN',
};

type PersistedCreateTournamentState = Partial<Omit<CreateTournamentState, 'formData'>> & {
  formData?: Partial<TournamentFormData>;
};

const normalizeFormData = (formData?: Partial<TournamentFormData>): TournamentFormData => ({
  ...defaultFormData,
  ...formData,
  sportRules: {
    ...defaultFormData.sportRules,
    ...formData?.sportRules,
  },
  matchFormat: formData?.matchFormat ?? defaultFormData.matchFormat,
  selectedFormats: Array.isArray(formData?.selectedFormats) ? formData.selectedFormats : [],
  registrationMode: formData?.registrationMode ?? defaultFormData.registrationMode,
});

export const useCreateTournamentStore = create<CreateTournamentState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      formData: defaultFormData,
      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      updateFormData: (data) =>
        set((state) => ({
          formData: normalizeFormData({ ...state.formData, ...data }),
        })),
      getDivisionsFromFormats: () => {
        const state = get();
        const formData = normalizeFormData(state.formData);
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
      reset: () => set({ currentStep: 1, formData: defaultFormData }),
    }),
    {
      name: 'create-tournament-storage-v2',
      version: 1,
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
