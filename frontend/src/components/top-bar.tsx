import { useState } from 'react';
import { NavLink } from 'react-router';
import { navItems } from '../navigation';

interface TopBarProps {
  userInitials: string;
}

const linkBaseClass =
  'inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function desktopLinkClass({ isActive }: { isActive: boolean }) {
  return `${linkBaseClass} ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-lilac/70'}`;
}

function mobileLinkClass({ isActive }: { isActive: boolean }) {
  return `${linkBaseClass} ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-lilac/70'} w-full`;
}

export function TopBar({ userInitials }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="glass-card sticky top-3 z-20 mx-3 px-4 py-2 md:mx-8">
      <div className="flex items-center justify-between gap-4">
        <span className="text-lg font-bold text-ink">AtomPlus Learn</span>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={desktopLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <span
            aria-label="Signed in user"
            className="flex size-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white"
          >
            {userInitials}
          </span>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Main mobile"
          className="mt-2 flex flex-col gap-1 pb-2 md:hidden"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={mobileLinkClass}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
