import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBearerToken, secretsMatch, validateSyncPayload } from './health';

test('extractBearerToken only accepts a non-empty Bearer token', () => {
  assert.equal(extractBearerToken('Bearer shared-secret'), 'shared-secret');
  assert.equal(extractBearerToken('Basic shared-secret'), null);
  assert.equal(extractBearerToken('Bearer   '), null);
});

test('secretsMatch compares exact values', () => {
  assert.equal(secretsMatch('same-secret', 'same-secret'), true);
  assert.equal(secretsMatch('same-secret', 'other-secret'), false);
  assert.equal(secretsMatch(null, 'same-secret'), false);
});

test('validateSyncPayload accepts known tiers and Discord snowflakes', () => {
  assert.deepEqual(validateSyncPayload({
    discord_id: '123456789012345678',
    tier: 'premium',
  }), {
    ok: true,
    value: { discord_id: '123456789012345678', tier: 'premium' },
  });
});

test('validateSyncPayload rejects malformed ids and tiers', () => {
  assert.equal(validateSyncPayload({ discord_id: 'abc', tier: 'pro' }).ok, false);
  assert.equal(validateSyncPayload({ discord_id: '123456789012345678', tier: 'owner' }).ok, false);
  assert.equal(validateSyncPayload(null).ok, false);
});
