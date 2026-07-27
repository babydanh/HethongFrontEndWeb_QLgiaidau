/**
 * bracket/ — barrel exports
 *
 * Usage in BracketTab.tsx (and any future views):
 *   import { SingleElimView, DoubleElimView, RoundRobinView, ... } from './bracket';
 */

export type {
  OnScheduleMatch,
  OnSelectBracketMatch,
  BracketTabProps,
  MatchPos,
  StandingRow,
  ScoreDetailsSet,
  ScoreDetailsShape,
  TiebreakerOptions,
  ParsedScore,
} from './types';
export {
  CARD_W,
  CARD_H_PUBLIC,
  CARD_H_ORGANIZER,
  BASE_SLOT,
  COL_GAP,
  UPPER_SET,
  LOWER_SET,
  parseScoreDetails,
} from './types';

export {
  buildMatchesByRound,
  getRoundLabel,
  calculateStandings,
  isSlotBye,
} from './helpers';

export { MatchCard } from './MatchCard';
export { SingleElimView } from './SingleElimView';
export { DoubleElimView } from './DoubleElimView';
export { RoundRobinView } from './RoundRobinView';
export { PagedSingleElimView } from './PagedSingleElimView';
export { PagedDoubleElimView } from './PagedDoubleElimView';
export { PagedRoundRobinView } from './PagedRoundRobinView';
export { tiebreakerSort } from './tiebreaker';
