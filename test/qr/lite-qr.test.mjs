import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLiteJoinUrl,
  isClubLiteTournament,
  isLiteTournament,
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
  assert.equal(
    isClubLiteTournament({ isLite: true, communityId: 'club-1' }),
    true,
  );
  assert.equal(isClubLiteTournament({ isLite: true }), false);
});
