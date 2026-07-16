import test from 'node:test';
import assert from 'node:assert/strict';
import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { getMissingSetupPermissions } from './setup';

const allSetupPermissions = new PermissionsBitField([
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
]);

test('getMissingSetupPermissions accepts all permissions required by setup', () => {
  assert.deepEqual(getMissingSetupPermissions(allSetupPermissions), []);
});

test('getMissingSetupPermissions accepts Administrator as an override', () => {
  assert.deepEqual(
    getMissingSetupPermissions(new PermissionsBitField(PermissionFlagsBits.Administrator)),
    []
  );
});

test('getMissingSetupPermissions reports the exact missing permissions', () => {
  const limitedPermissions = allSetupPermissions.remove([
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
  ]);

  assert.deepEqual(getMissingSetupPermissions(limitedPermissions), [
    'Gérer les salons',
    'Gérer les rôles',
  ]);
});
