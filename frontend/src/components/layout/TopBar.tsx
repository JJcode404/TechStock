import { Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export function TopBar() {
  const { user, logout } = useAuth();
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <header className="flex items-center gap-4 px-8 py-4">
      <div className="relative max-w-xl flex-1">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-content-muted"
        />
        <input
          type="text"
          placeholder="Search products, sales, customers…"
          className="w-full rounded-full border border-hairline bg-surface py-2.5 pl-11 pr-24 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-ink-900 px-2 py-1 text-[11px] font-medium text-white">
          ⌘ + Space
        </span>
      </div>

      <button
        className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface text-content-secondary hover:text-content"
        aria-label="Notifications"
      >
        <Bell size={18} />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-heading text-sm font-semibold text-primary-700">
          {initials}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-content">
            {user ? `${user.firstName} ${user.lastName}` : ''}
          </p>
          <p className="text-xs text-content-muted">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-content-muted hover:bg-slate-100 hover:text-content"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
