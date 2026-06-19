declare module '@g-loot/react-tournament-brackets' {
  import { ReactElement, ReactNode } from 'react';

  export interface ParticipantType {
    id: string | number;
    isWinner?: boolean;
    name?: string;
    status?: string | null;
    resultText?: string | null;
    [key: string]: unknown;
  }

  export interface MatchType {
    id: number | string;
    href?: string;
    name?: string;
    nextMatchId: number | string | null;
    nextLooserMatchId?: number | string;
    tournamentRoundText?: string;
    startTime: string;
    state: string;
    participants: ParticipantType[];
    [key: string]: unknown;
  }

  export interface MatchComponentProps {
    match: MatchType;
    onMatchClick: (args: unknown) => void;
    onPartyClick: (party: ParticipantType, partyWon: boolean) => void;
    onMouseEnter: (partyId: string | number) => void;
    onMouseLeave: () => void;
    topParty: ParticipantType;
    bottomParty: ParticipantType;
    topWon: boolean;
    bottomWon: boolean;
    topHovered: boolean;
    bottomHovered: boolean;
    topText: string;
    bottomText: string;
    connectorColor?: string;
    computedStyles?: unknown;
    teamNameFallback: string;
    resultFallback: (participant: ParticipantType) => string;
  }

  export interface CommonTreeProps {
    svgWrapper?: (props: {
      bracketWidth: number;
      bracketHeight: number;
      startAt: number[];
      children: ReactNode;
    }) => ReactElement;
    theme?: unknown;
    options?: {
      style?: unknown;
    };
  }

  export interface SingleEliminationBracketProps extends CommonTreeProps {
    matches: MatchType[];
    matchComponent: (props: unknown) => JSX.Element;
    currentRound?: string;
    onMatchClick?: (args: unknown) => void;
    onPartyClick?: (party: ParticipantType, partyWon: boolean) => void;
  }

  export interface DoubleEliminationBracketProps extends CommonTreeProps {
    matches: MatchType[] | {
      upper: MatchType[];
      lower: MatchType[];
    };
    matchComponent: (props: unknown) => JSX.Element;
    currentRound?: string;
    onMatchClick?: (args: unknown) => void;
    onPartyClick?: (party: ParticipantType, partyWon: boolean) => void;
  }

  export const SingleEliminationBracket: (props: SingleEliminationBracketProps) => JSX.Element;
  export const DoubleEliminationBracket: (props: DoubleEliminationBracketProps) => JSX.Element;
  export const Match: (props: unknown) => JSX.Element;
  export const SVGViewer: (props: unknown) => JSX.Element;
  export const createTheme: (theme: unknown) => unknown;
  export const MATCH_STATES: unknown;
}
