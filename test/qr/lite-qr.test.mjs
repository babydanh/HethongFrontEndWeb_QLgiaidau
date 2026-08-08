import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLiteJoinUrl, isScannableJoinUrl, isScannableLiteJoinUrl } from '../../src/features/tournaments/lite-qr.ts';

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
