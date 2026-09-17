import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error TS5097 is intentional for this Node-native test entrypoint.
import { normalizeCommunityMediaSources } from '../../src/features/communities/media.ts';

test('keeps commas that belong to a Cloudinary URL', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200/tournahub/community.jpg';
  assert.deepEqual(normalizeCommunityMediaSources(url), [url]);
});

test('splits only legacy values containing multiple URL sources', () => {
  assert.deepEqual(
    normalizeCommunityMediaSources('https://cdn.example/a.jpg, https://cdn.example/b.jpg\n/uploads/c.jpg'),
    ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg', '/uploads/c.jpg'],
  );
});

test('accepts JSON URL arrays and removes duplicate sources', () => {
  assert.deepEqual(
    normalizeCommunityMediaSources('["https://cdn.example/a.jpg","https://cdn.example/a.jpg"]'),
    ['https://cdn.example/a.jpg'],
  );
});
