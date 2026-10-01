import { BarChart3, Gamepad2, History, Settings } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: 'الرئيسية', icon: Gamepad2 },
  { to: '/history', label: 'المباريات', icon: History },
  { to: '/stats', label: 'إحصائيات', icon: BarChart3 },
  { to: '/settings', label: 'الإعدادات', icon: Settings }
];

export function AppShell() {
  const { pathname } = useLocation();
  const focusedFlow = pathname.startsWith('/game/') || pathname.startsWith('/new/');
  return <div className="scrollbar-hidden min-h-dvh"><Outlet />{!focusedFlow && <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-3xl border-t border-slate-200/80 bg-[color:var(--surface)]/90 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-white/10" aria-label="التنقل الرئيسي">
    <div className="grid grid-cols-4">{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition ${isActive ? 'bg-mint-500/10 text-mint-600 dark:text-mint-400' : 'text-slate-500 dark:text-slate-400'}`}><Icon size={20}/>{label}</NavLink>)}</div>
  </nav>}</div>;
}
