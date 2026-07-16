import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateNames } from './audit';

test('duplicateNames reports each duplicate once', () => {
  assert.deepEqual(duplicateNames(['Membre', 'Admin', 'Membre', 'Admin', 'Admin']), [
    'Membre',
    'Admin',
  ]);
});

test('duplicateNames ignores unique values', () => {
  assert.deepEqual(duplicateNames(['Membre', 'Admin']), []);
});
