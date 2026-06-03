import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { UserFunction, UserFunctionId } from '../functions/types';

type SidebarProps = {
  activeFunctionId: UserFunctionId;
  functions: UserFunction[];
  onSelectFunction: (functionId: UserFunctionId) => void;
  onLogout: () => void;
  user: {
    name: string;
    phone: string;
    email: string;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export function Sidebar({ activeFunctionId, functions, onSelectFunction, onLogout, user, isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname.replace(/^\//, '');

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col justify-between border-r border-subtle bg-primary-bg px-4 dark:border-white/10 dark:bg-neutral-950 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)'
      }}
    >
      <div>
        <div className="mb-8 flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-subtle bg-tertiary-surface text-sm font-semibold text-main dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
              UA
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-main dark:text-white">UserApp</h1>
              <p className="text-xs font-medium text-muted dark:text-neutral-500">Functions</p>
            </div>
          </div>
          {/* Close button for mobile navigation menu */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-subtle bg-transparent text-secondary hover:bg-hover-surface hover:text-main dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-neutral-200 md:hidden cursor-pointer"
            aria-label="Close navigation menu"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="space-y-1.5">
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
                className={`flex h-12 w-full items-center gap-3.5 rounded-xl px-3.5 text-base font-semibold transition-colors ${
                  isActive
                    ? 'bg-hover-surface text-main shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-white/[0.07] dark:text-white dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                    : 'text-secondary hover:bg-hover-surface hover:text-main dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-neutral-200'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-subtle bg-secondary-bg p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-2 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-green" />
            </span>
            <span className="text-sm font-semibold text-secondary dark:text-neutral-300">Services online</span>
          </div>
          <p className="truncate font-mono text-xs text-muted dark:text-neutral-500">gateway :3002</p>
          <p className="truncate font-mono text-xs text-muted dark:text-neutral-500">auth-service :3001</p>
        </div>

        {/* User Card & Logout Button */}
        <div className="rounded-xl border border-subtle bg-secondary-bg p-4 dark:border-white/10 dark:bg-white/[0.03] space-y-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5E6AD2]/10 text-xs font-bold text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-main dark:text-white">{user.name}</p>
              <p className="truncate text-xs text-muted dark:text-neutral-500">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E5E6] bg-white text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-50/50 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Modern Premium Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#18181b] animate-fadeIn">
            <div className="flex flex-col items-center text-center">
              {/* Elegant Warning Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">Confirm Logout</h3>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Are you sure you want to sign out of UserApp? You will need to log in again to access your workspace.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="w-1/2 rounded-xl border border-neutral-200 bg-white py-2.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all outline-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-1/2 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-all outline-none cursor-pointer"
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

