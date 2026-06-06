import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, X, ShieldAlert } from 'lucide-react';
import type { AdminFunction, AdminFunctionId } from '../app/AdminApp';

type SidebarProps = {
  activeFunctionId: AdminFunctionId;
  functions: AdminFunction[];
  onSelectFunction: (functionId: AdminFunctionId) => void;
  onLogout: () => void;
  user: {
    name: string;
    phone: string;
    email: string;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export function Sidebar({
  activeFunctionId,
  functions,
  onSelectFunction,
  onLogout,
  user,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col justify-between border-r border-subtle bg-primary-bg px-4 dark:border-white/10 dark:bg-neutral-950 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)',
      }}
    >
      <div>
        {/* Brand Header */}
        <div className="mb-8 flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
              AD
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-main dark:text-white">AdminPortal</h1>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-neutral-500">
                Control Center
              </p>
            </div>
          </div>
          {/* Close button for mobile navigation menu */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-subtle bg-transparent text-secondary hover:bg-hover-surface hover:text-main dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-neutral-200 md:hidden cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="space-y-1">
          {functions.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.id;

            return (
              <Link
                key={item.id}
                to={`/${item.id}`}
                onClick={() => {
                  onSelectFunction(item.id);
                  onCloseMobile?.();
                }}
                className={`flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-hover-surface text-indigo-600 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] dark:bg-white/[0.06] dark:text-indigo-400 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                    : 'text-secondary hover:bg-hover-surface hover:text-main dark:text-neutral-400 dark:hover:bg-white/[0.03] dark:hover:text-neutral-200'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout Button */}
      <div className="space-y-3">
        <div className="rounded-2xl border border-subtle bg-secondary-bg p-4 dark:border-white/10 dark:bg-white/[0.02] space-y-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-55 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-main dark:text-white leading-none mb-1">
                {user.name}
              </p>
              <p className="truncate text-[10px] text-muted dark:text-neutral-500 font-medium">
                {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200/50 bg-red-50/50 text-xs font-bold text-red-650 hover:bg-red-50 hover:text-red-700 dark:border-red-950/20 dark:bg-red-950/20 dark:text-red-450 dark:hover:bg-red-900/30 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-all duration-300">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-250 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900/90 dark:backdrop-blur-md animate-scaleUp">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>

              <h3 className="text-base font-bold text-neutral-900 dark:text-white">Sign Out?</h3>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Are you sure you want to log out of the Admin Portal? You will need your password to log back in.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="w-1/2 rounded-xl border border-neutral-200 bg-white py-2.5 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-1/2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-all cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
