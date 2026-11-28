import { expect, it } from 'vitest';
import { navItems } from './navigation.ts';

it('top bar shows the four employee links in order', () => {
  expect(navItems.map((item) => item.label)).toEqual([
    'Courses',
    'My Batch',
    'Certificates',
    'My Profile',
  ]);
});

it('every link has a unique path that starts with a slash', () => {
  const paths = navItems.map((item) => item.path);
  expect(paths.every((path) => path.startsWith('/'))).toBe(true);
  expect(new Set(paths).size).toBe(paths.length);
});
