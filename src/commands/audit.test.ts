import test from 'node:test';
import assert from 'node:assert/strict';
import { duplicateNames, hasStrictlyDescendingPositions } from './audit';

test('duplicateNames reports each duplicate once', () => {
  assert.deepEqual(duplicateNames(['Membre', 'Admin', 'Membre', 'Admin', 'Admin']), [
    'Membre',
    'Admin',
  ]);
});

test('duplicateNames ignores unique values', () => {
  assert.deepEqual(duplicateNames(['Membre', 'Admin']), []);
});

test('hasStrictlyDescendingPositions accepts the expected role hierarchy', () => {
  assert.equal(hasStrictlyDescendingPositions([12, 10, 8, 4, 3]), true);
});

test('hasStrictlyDescendingPositions rejects equal or inverted positions', () => {
  assert.equal(hasStrictlyDescendingPositions([12, 10, 10, 4, 3]), false);
  assert.equal(hasStrictlyDescendingPositions([12, 8, 10, 4, 3]), false);
});
