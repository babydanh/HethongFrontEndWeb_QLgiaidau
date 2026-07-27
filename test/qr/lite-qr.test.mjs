import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLiteJoinUrl, isScannableLiteJoinUrl } from '../../src/features/tournaments/lite-qr.ts';

test('builds canonical absolute HTTPS Lite join URL', () => {
  assert.equal(buildLiteJoinUrl('I6H7R0DV', 'https://giaidau.vnvar.com/'), 'https://giaidau.vnvar.com/lite/tournaments/join/I6H7R0DV');
});

test('rejects relative and non-http QR payloads', () => {
  assert.equal(isScannableLiteJoinUrl('/lite/tournaments/join/I6H7R0DV'), false);
  assert.equal(isScannableLiteJoinUrl('https://giaidau.vnvar.com/lite/tournaments/join/I6H7R0DV'), true);
});
