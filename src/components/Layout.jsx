import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  BadgePercent,
  History,
  BarChart3,
  Network,
  Settings,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useCouponStore } from '../utils/useCouponStore.js';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/coupons', label: 'Coupons', icon: Ticket },
  { to: '/apply', label: 'Apply Coupon', icon: BadgePercent },
  { to: '/history', label: 'Usage History', icon: History },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dsa', label: 'DSA Implementation', icon: Network },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { store } = useCouponStore();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const current = NAV.find((n) => pathname.startsWith(n.to));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <div className="brand-name">CouponLimit</div>
            <div className="brand-sub">Usage Tracker</div>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          <div className="nav-label">Menu</div>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div>
            HashMap: <strong>{store.coupons.size}</strong> coupons
          </div>
          <div>
            Deque: <strong>{store.history.size()}/{store.history.capacity()}</strong> records
          </div>
        </div>
      </aside>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="topbar-title">{current ? current.label : 'Coupon Tracker'}</span>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
