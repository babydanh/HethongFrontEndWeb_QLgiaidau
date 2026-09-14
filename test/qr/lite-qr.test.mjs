import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLiteJoinUrl,
  isClubLiteTournament,
  isClubSuperLiteTournament,
  isLiteTournament,
  isSuperLiteTournament,
  isScannableJoinUrl,
  isScannableLiteJoinUrl,
} from '../../src/features/tournaments/lite-qr.ts';

test('builds canonical absolute HTTPS Lite join URL', () => {
  assert.equal(buildLiteJoinUrl('I6H7R0DV', 'https://giaidau.vnvar.com/'), 'https://giaidau.vnvar.com/lite/tournaments/join/I6H7R0DV');
});

test('rejects relative and non-http QR payloads', () => {
  assert.equal(isScannableLiteJoinUrl('/lite/tournaments/join/I6H7R0DV'), false);
  assert.equal(isScannableLiteJoinUrl('https://giaidau.vnvar.com/lite/tournaments/join/I6H7R0DV'), true);
});

test('isScannableJoinUrl accepts register link with invite query', () => {
  assert.equal(
    isScannableJoinUrl('https://giaidau.vnvar.com/tournaments/abc-123/register?invite=I6H7R0DV'),
    true,
  );
  assert.equal(isScannableJoinUrl('https://giaidau.vnvar.com/tournaments/abc-123/register'), false);
});

test('isScannableJoinUrl accepts lite join URL and rejects detail page', () => {
  assert.equal(isScannableJoinUrl('https://giaidau.vnvar.com/lite/tournaments/join/I6H7R0DV'), true);
  assert.equal(isScannableJoinUrl('https://giaidau.vnvar.com/tournaments/abc-123'), false);
});

test('does not classify scoring mode as the Super Lite product', () => {
  assert.equal(
    isLiteTournament({
      communityId: 'club-1',
      tournamentConfig: { mode: 'LITE', scoringMode: 'FREE' },
      sportRules: { mode: 'LITE' },
    }),
    false,
  );
});

test('keeps explicit and legacy Lite product detection stable', () => {
  assert.equal(isLiteTournament({ isLite: true }), true);
  assert.equal(
    isLiteTournament({ tournamentConfig: { mode: 'LITE', hideAdvancedSettings: true } }),
    true,
  );
  assert.equal(isSuperLiteTournament({ isLite: true }), false);
  assert.equal(isClubLiteTournament({ isLite: true, communityId: 'club-1' }), false);
  assert.equal(isClubSuperLiteTournament({ isLite: true, communityId: 'club-1' }), false);
});

test('separates Super Lite from configured Lite/Quick', () => {
  const superLite = {
    isLite: true,
    communityId: 'club-1',
    tournamentConfig: { isLite: true, mode: 'LITE', hideAdvancedSettings: true },
  };
  const configuredLite = {
    isLite: true,
    communityId: 'club-1',
    tournamentConfig: { isLite: true, mode: 'LITE', hideAdvancedSettings: false },
  };

  assert.equal(isLiteTournament(superLite), true);
  assert.equal(isSuperLiteTournament(superLite), true);
  assert.equal(isClubSuperLiteTournament(superLite), true);

  assert.equal(isLiteTournament(configuredLite), true);
  assert.equal(isSuperLiteTournament(configuredLite), false);
  assert.equal(isClubSuperLiteTournament(configuredLite), false);
});

test('keeps advanced product separate even with Lite scoring', () => {
  const advanced = {
    communityId: 'club-1',
    tournamentConfig: { isLite: false, mode: 'LITE', scoringMode: 'FREE' },
    sportRules: { mode: 'LITE' },
  };

  assert.equal(isLiteTournament(advanced), false);
  assert.equal(isSuperLiteTournament(advanced), false);
  assert.equal(isClubSuperLiteTournament(advanced), false);
});
