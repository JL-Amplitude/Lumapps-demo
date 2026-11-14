import { NavLink, Outlet, Link } from "react-router-dom";
import { Home, Newspaper, Bot, CalendarClock, LayoutGrid, Plug } from "lucide-react";
import { useSession } from "../lib/session";
import KnowledgeSearch from "./KnowledgeSearch";
import CompanyLogo from "./CompanyLogo";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/shifts", label: "My Shift", icon: CalendarClock },
  { to: "/apps", label: "Apps", icon: LayoutGrid },
];

export default function Layout() {
  const { session } = useSession();
  const initials = session!.name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white px-4 py-5 md:flex">
        <Link to="/" className="mb-8 px-2"><CompanyLogo account={session!.account} /></Link>
        <nav className="flex flex-1 flex-col gap-1">
          {[...NAV, { to: "/integrations", label: "Integrations", icon: Plug }].map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <div className="font-semibold text-slate-700">{session!.account.account_name}</div>
          Powered by Lumapps · Amplitude demo
        </div>
      </aside>

      <div className="md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8" style={{ top: "env(safe-area-inset-top, 0px)" }}>
          <Link to="/" className="md:hidden"><CompanyLogo account={session!.account} compact /></Link>
          <div className="flex-1"><KnowledgeSearch /></div>
          <Link to="/me" className="flex items-center gap-2" aria-label="My account">
            <span className="hidden text-right text-xs sm:block">
              <span className="block font-semibold text-slate-800">{session!.name}</span>
              <span className="text-slate-500">{session!.workforceType.replace("_", " ")}</span>
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">{initials}</span>
          </Link>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {NAV.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink key={to} to={to} end={"end" in rest}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? "text-brand-600" : "text-slate-500"}`}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
