import { useState } from 'react';
import { RoutesComponent } from './Routes';
import { Sidebar } from './Sidebar';
import { AiAssistantPanel } from './AiAssistantPanel';
import type { ThemeMode } from '../app/UserApp';
import type { UserFunction, UserFunctionId } from '../functions/types';

type AppShellProps = {
  activeFunction: UserFunction;
  activeFunctionId: UserFunctionId;
  functions: UserFunction[];
  onSelectFunction: (functionId: UserFunctionId) => void;
  onToggleTheme: () => void;
  themeMode: ThemeMode;
  onLogout: () => void;
  user: {
    name: string;
    phone: string;
    email: string;
  };
};

export function AppShell({
  activeFunction,
  activeFunctionId,
  functions,
  onSelectFunction,
  onToggleTheme,
  themeMode,
  onLogout,
  user,
}: AppShellProps) {

  const isDarkMode = themeMode === 'dark';
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div>
      <div className="flex h-screen overflow-hidden bg-[#F7F8F8] font-sans text-[#08090A] dark:bg-neutral-950 dark:text-neutral-100">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeFunctionId={activeFunctionId}
        functions={functions}
        onSelectFunction={onSelectFunction}
        onLogout={onLogout}
        user={user}
        isMobileOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-20 flex h-16 items-center justify-between border-b border-[#E5E5E6] bg-[#FFFFFF] px-4 md:px-8 dark:border-white/10 dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            {/* Hamburger menu trigger for mobile devices */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E6] bg-[#FFFFFF] text-[#62666D] hover:bg-[#F1F2F4] hover:text-[#08090A] dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer md:hidden shadow-sm"
              aria-label="Open navigation menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-sm md:text-base font-semibold tracking-tight text-[#08090A] dark:text-white">{activeFunction.name}</h2>
              <p className="text-[10px] md:text-xs font-medium text-[#8A8F98] dark:text-neutral-500">{activeFunction.statusLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E6] bg-[#FFFFFF] text-[#62666D] transition-colors hover:bg-[#F1F2F4] hover:text-[#08090A] dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M21 12.79A8.5 8.5 0 1 1 11.21 3 6.5 6.5 0 0 0 21 12.79z"
                  />
                </svg>
              )}
            </button>

            {/* AI Assistant bordered button positioned here in place of workspace ready block */}
            <button
              type="button"
              onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
              className={`flex h-8 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm cursor-pointer whitespace-nowrap ${
                isAiPanelOpen
                  ? 'border-[#5E6AD2] bg-[#5E6AD2]/10 text-[#5E6AD2] dark:border-[#717CFF] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                  : 'border-[#5E6AD2]/30 bg-white text-[#5E6AD2] hover:bg-[#5E6AD2]/5 dark:border-[#717CFF]/30 dark:bg-white/[0.03] dark:text-[#717CFF] dark:hover:bg-[#717CFF]/5'
              }`}
              title={isAiPanelOpen ? "Close AI Assistant" : "Open AI Assistant"}
            >
              {/* Double sparkling AI stars icon (large star + small star sparkles) */}
              <svg className="h-[18px] w-[18px] text-[#5E6AD2] dark:text-[#717CFF]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.187.904z" />
                <path d="M19.071 4.929l-.707 3.536-3.536.707 3.536.707.707 3.536.707-3.536 3.536-.707-3.536-.707-.707-3.536z" />
              </svg>
              <span className="whitespace-nowrap">AI Assistant</span>
            </button>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E5E6] bg-[#F3F4F6] text-xs font-semibold text-[#62666D] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
              AD
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          <section className="flex-1 overflow-y-auto bg-[#F7F8F8] p-4 md:p-8 dark:bg-neutral-950">
            <RoutesComponent functions={functions} />
          </section>

          {/* AI Assistant Right Panel */}
          <AiAssistantPanel isOpen={isAiPanelOpen} onClose={() => setIsAiPanelOpen(false)} />
        </div>
      </main>
    </div>
    </div>
  );
}
