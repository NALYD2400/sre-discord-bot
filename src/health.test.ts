import test from 'node:test';
import assert from 'node:assert/strict';
import type { Guild } from 'discord.js';
import { extractBearerToken, fetchGuildMemberFresh, secretsMatch, validatePatchnotePayload, validateSyncPayload } from './health';

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
    value: {
      discord_id: '123456789012345678',
      tier: 'premium',
      require_membership: false,
    },
  });
});

test('validateSyncPayload accepts an explicit membership requirement', () => {
  assert.deepEqual(validateSyncPayload({
    discord_id: '123456789012345678',
    tier: 'free',
    require_membership: true,
  }), {
    ok: true,
    value: {
      discord_id: '123456789012345678',
      tier: 'free',
      require_membership: true,
    },
  });
});

test('validateSyncPayload rejects malformed ids and tiers', () => {
  assert.equal(validateSyncPayload({ discord_id: 'abc', tier: 'pro' }).ok, false);
  assert.equal(validateSyncPayload({ discord_id: '123456789012345678', tier: 'owner' }).ok, false);
  assert.equal(validateSyncPayload({
    discord_id: '123456789012345678',
    tier: 'pro',
    require_membership: 'yes',
  }).ok, false);
  assert.equal(validateSyncPayload(null).ok, false);
});

test('fetchGuildMemberFresh bypasses the Discord member cache', async () => {
  let receivedOptions: unknown;
  const expectedMember = { id: '123456789012345678' };
  const guild = {
    members: {
      fetch: async (options: unknown) => {
        receivedOptions = options;
        return expectedMember;
      },
    },
  } as unknown as Guild;

  const member = await fetchGuildMemberFresh(guild, expectedMember.id);

  assert.equal(member, expectedMember);
  assert.deepEqual(receivedOptions, { user: expectedMember.id, force: true });
});

test('validatePatchnotePayload validates version and notes', () => {
  assert.deepEqual(validatePatchnotePayload({
    version: '0.4.3',
    notes: '- Ajout des patchnotes automatiques',
    artifact_url: 'https://github.com/releases/download/0.4.3/setup.exe',
  }), {
    ok: true,
    value: {
      version: '0.4.3',
      notes: '- Ajout des patchnotes automatiques',
      artifact_url: 'https://github.com/releases/download/0.4.3/setup.exe',
    },
  });

  assert.equal(validatePatchnotePayload({ version: '', notes: 'notes' }).ok, false);
  assert.equal(validatePatchnotePayload({ version: '0.4.3', notes: '' }).ok, false);
  assert.equal(validatePatchnotePayload(null).ok, false);
});
