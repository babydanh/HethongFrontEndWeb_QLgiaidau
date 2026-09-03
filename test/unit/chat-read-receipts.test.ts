import assert from 'node:assert/strict';
import test from 'node:test';

import { applyRoomReadEvent, getMessageViewers } from '../../src/features/chat/read-receipts';
import type { ChatParticipant } from '../../src/types/chat';

const message = {
  senderId: 'sender',
  createdAt: '2026-01-01T10:00:00.000Z',
};

const participant = (
  id: string,
  lastReadAt: string | null,
  fullName = id,
): ChatParticipant => ({ id, fullName, avatarUrl: null, lastReadAt });

test('includes a viewer at the exact message timestamp boundary', () => {
  const viewers = getMessageViewers(
    [participant('viewer', message.createdAt)],
    undefined,
    message,
    'sender',
  );
  assert.deepEqual(viewers.map(({ id }) => id), ['viewer']);
});

test('excludes the sender and current user', () => {
  const viewers = getMessageViewers(
    [
      participant('sender', '2026-01-01T10:01:00.000Z'),
      participant('current', '2026-01-01T10:01:00.000Z'),
      participant('viewer', '2026-01-01T10:01:00.000Z'),
    ],
    undefined,
    message,
    'current',
  );
  assert.deepEqual(viewers.map(({ id }) => id), ['viewer']);
});

test('deduplicates viewers by user ID', () => {
  const viewers = getMessageViewers(
    [
      participant('viewer', '2026-01-01T10:01:00.000Z', 'First'),
      participant('viewer', '2026-01-01T10:02:00.000Z', 'Duplicate'),
    ],
    undefined,
    message,
    'sender',
  );
  assert.equal(viewers.length, 1);
  assert.equal(viewers[0]?.id, 'viewer');
});

test('returns zero viewers when nobody has read the message so UI remains sent', () => {
  const viewers = getMessageViewers(
    [participant('viewer', '2026-01-01T09:59:59.999Z')],
    undefined,
    message,
    'sender',
  );
  assert.equal(viewers.length, 0);
});

test('realtime read event updates the canonical room timestamp used by derivation', () => {
  const state = applyRoomReadEvent({}, {
    roomId: 'room',
    userId: 'viewer',
    readAt: message.createdAt,
  });
  const viewers = getMessageViewers(
    [participant('viewer', null)],
    state.room,
    message,
    'sender',
  );
  assert.deepEqual(viewers.map(({ id }) => id), ['viewer']);
});
