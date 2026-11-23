export interface NavItem {
  label: string;
  path: string;
}

export const navItems: readonly NavItem[] = [
  { label: 'Courses', path: '/courses' },
  { label: 'My Batch', path: '/my-batch' },
  { label: 'Certificates', path: '/certificates' },
  { label: 'My Profile', path: '/profile' },
];
