import { NavLink, Outlet, Link } from "react-router-dom";
import AccountPanel from "./AccountPanel";

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm transition-colors ${
    isActive ? "text-primary bg-primary/10" : "text-textSecondary hover:text-textPrimary"
  }`;

function IconFeed() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 6h16M4 12h10M4 18h13" />
    </svg>
  );
}
function IconPen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function IconPulse() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h4l3-8 4 16 3-8h6" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

const mobileItems = [
  { to: "/feed", label: "Feed", icon: IconFeed },
  { to: "/post", label: "Write", icon: IconPen },
  { to: "/live", label: "Live", icon: IconPulse },
  { to: "/me", label: "Me", icon: IconUser }
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="w-2 h-2 rounded-full bg-primary group-hover:animate-pulse" />
              <span className="font-semibold tracking-tight text-[17px]">Stanza</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <NavLink to="/feed" className={desktopLink}>
                Feed
              </NavLink>
              <NavLink to="/live" className={desktopLink}>
                Live
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/post" className={desktopLink}>
              Write
            </NavLink>
            <AccountPanel />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 pb-28 sm:pb-10">
        <Outlet />
      </main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  isActive ? "text-primary" : "text-textSecondary"
                }`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
