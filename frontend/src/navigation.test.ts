import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navItems } from './navigation.ts';

test('top bar shows the four employee links in order', () => {
  assert.deepEqual(
    navItems.map((item) => item.label),
    ['Courses', 'My Batch', 'Certificates', 'My Profile'],
  );
});

test('every link has a unique path that starts with a slash', () => {
  const paths = navItems.map((item) => item.path);
  assert.ok(paths.every((path) => path.startsWith('/')));
  assert.equal(new Set(paths).size, paths.length);
});
