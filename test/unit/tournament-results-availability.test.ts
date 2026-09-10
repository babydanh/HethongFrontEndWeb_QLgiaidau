import assert from 'node:assert/strict';
import test from 'node:test';

// Node's native TypeScript runner requires the extension; the repository
// compiler does not enable TypeScript-extension imports for application code.
// @ts-expect-error TS5097 is intentional for this Node-native test entrypoint.
import { hasPublishedTournamentResults } from '../../src/features/tournaments/result-availability.ts';

const participant = {
  participantId: 'participant-1',
  teamName: 'Team One',
};

test('does not publish results for completed or finalized empty payloads', () => {
  assert.equal(
    hasPublishedTournamentResults({
      tournamentId: 'tournament-1',
      status: 'COMPLETED',
      finalized: false,
      awards: [],
      standings: [],
      matches: [],
    }),
    false,
  );
  assert.equal(
    hasPublishedTournamentResults({
      tournamentId: 'tournament-1',
      status: 'COMPLETED',
      finalized: true,
      awards: [],
      standings: [],
      matches: [],
    }),
    false,
  );
});

test('requires both a valid rank and participant', () => {
  const base = {
    tournamentId: 'tournament-1',
    status: 'COMPLETED',
    finalized: true,
    standings: [],
    matches: [],
  };

  assert.equal(
    hasPublishedTournamentResults({
      ...base,
      awards: [{ rank: 1, shared: false, participant: null }],
    }),
    false,
  );
  assert.equal(
    hasPublishedTournamentResults({
      ...base,
      awards: [{ rank: 0, shared: false, participant }],
    }),
    false,
  );
});

test('publishes results when a ranked participant is available', () => {
  assert.equal(
    hasPublishedTournamentResults({
      tournamentId: 'tournament-1',
      status: 'COMPLETED',
      finalized: false,
      awards: [{ rank: 1, shared: false, participant }],
      standings: [],
      matches: [],
    }),
    true,
  );
});
