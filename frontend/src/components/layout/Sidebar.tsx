import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  Package,
  Boxes,
  ClipboardList,
  Users,
  Truck,
  BarChart3,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pos', label: 'Point of Sale', icon: ScanLine },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
];

export function Sidebar() {
  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-hairline bg-surface">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
          <ScanLine size={18} />
        </div>
        <span className="font-heading text-lg font-bold text-content">TechStock POS</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-ink-900 text-white'
                  : 'text-content-secondary hover:bg-slate-100 hover:text-content',
              ].join(' ')
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-2xl bg-ink-900 p-4 text-white">
        <p className="font-heading text-sm font-semibold">TechStock POS</p>
        <p className="mt-1 text-xs text-slate-300">
          Manage sales, inventory &amp; suppliers — even offline.
        </p>
      </div>
    </aside>
  );
}
