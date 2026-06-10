import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TournamentFormData {
  // Step 1: Info
  name: string;
  description: string;
  categoryId: string;
  communityId: string;
  tournamentType: 'CLUB' | 'PUBLIC';
  matchType: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  // Step 2: Format
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';
  maxParticipants: number | null;
  sportRules: {
    setsToWin: number;
    pointsPerSet: number;
    winByTwo: boolean;
  };
  // Step 3: Schedule & Venue
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  venueId: string;
  // Step 4: Fees
  entryFee: number;
}

interface CreateTournamentState {
  currentStep: number;
  formData: TournamentFormData;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<TournamentFormData>) => void;
  reset: () => void;
}

const defaultFormData: TournamentFormData = {
  name: '',
  description: '',
  categoryId: '',
  communityId: '',
  tournamentType: 'PUBLIC',
  matchType: 'DOUBLES',
  format: 'SINGLE_ELIMINATION',
  maxParticipants: null,
  sportRules: {
    setsToWin: 2,
    pointsPerSet: 21,
    winByTwo: true,
  },
  startDate: '',
  endDate: '',
  registrationStartDate: '',
  registrationEndDate: '',
  venueId: '',
  entryFee: 0,
};

export const useCreateTournamentStore = create<CreateTournamentState>()(
  persist(
    (set) => ({
      currentStep: 1,
      formData: defaultFormData,
      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      reset: () => set({ currentStep: 1, formData: defaultFormData }),
    }),
    {
      name: 'create-tournament-storage', // key in local storage
      // Only persist formData and currentStep
    }
  )
);
