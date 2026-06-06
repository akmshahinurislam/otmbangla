import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutesComponent } from './Routes';
import { Sidebar } from './Sidebar';
import { AiAssistantPanel } from './AiAssistantPanel';
import type { ThemeMode } from '../app/UserApp';
import type { UserFunction, UserFunctionId } from '../functions/types';
import { Search, Home, Inbox, Calculator, Menu, Bot, Bell, FileText, Cpu, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../shared/config';
import { TENDER_NOTICES_DATA } from '../functions/tender-notices/constants';

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
  lang: 'bn' | 'en';
  onLangChange: (lang: 'bn' | 'en') => void;
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
  lang,
  onLangChange,
}: AppShellProps) {

  const isDarkMode = themeMode === 'dark';
  const navigate = useNavigate();
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPcNotificationsOpen, setIsPcNotificationsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [subPreferences, setSubPreferences] = useState<{
    categories: string[];
    organizations: string[];
    locations: string[];
  } | null>(null);

  const bellDropdownRef = useRef<HTMLDivElement>(null);

  // Sync notification preferences from webscrap-service MongoDB on mount & periodic polling
  useEffect(() => {
    if (!user.email) return;

    async function fetchPreferences() {
      try {
        const response = await fetch(`${getApiUrl(3003)}/api/alerts/subscription/${encodeURIComponent(user.email)}`);
        if (response.ok) {
          const sub = await response.json();
          if (sub) {
            setSubPreferences({
              categories: sub.categories || [],
              organizations: sub.organizations || [],
              locations: sub.locations || [],
            });
            return;
          }
        }
      } catch (error) {
        console.warn('[AppShell] Alerts subscription fetch failed or not configured yet:', error);
      }

      // Fallback default mock preferences if user is offline or hasn't setup preferences yet
      setSubPreferences({
        categories: ['Cat-001', 'Cat-026'],
        organizations: ['Org-01'],
        locations: ['Loc-01']
      });
    }

    fetchPreferences();
  }, [user.email]);

  // Refetch immediately when mobile or PC notification panels are opened
  useEffect(() => {
    if ((isNotificationsOpen || isPcNotificationsOpen) && user.email) {
      fetch(`${getApiUrl(3003)}/api/alerts/subscription/${encodeURIComponent(user.email)}`)
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(sub => {
          if (sub) {
            setSubPreferences({
              categories: sub.categories || [],
              organizations: sub.organizations || [],
              locations: sub.locations || [],
            });
          }
        })
        .catch(() => { });
    }
  }, [isNotificationsOpen, isPcNotificationsOpen, user.email]);

  // Filter TENDER_NOTICES_DATA dynamically based on user alerts preference selections
  const matchedNotices = useMemo(() => {
    // 3 high-fidelity premium demo notifications containing real-world tenders
    const demoAlerts = [
      {
        id: 'T-741029',
        title: 'Construction of 4-Storied Multi-Purpose Building at Ramna',
        description: 'A new e-GP tender notice for building construction matching your Civil Engineering category was published by LGED Dhaka.',
        category: 'Building Construction',
        categoryId: 'Cat-026',
        organization: 'Local Government Engineering Department',
        organizationId: 'Org-01',
        district: 'Dhaka',
        districtId: 'Loc-01',
        publishedDate: '2026-05-31',
        budget: 'BDT 4.5 Crore',
        method: 'OTM',
        status: 'Live',
        isSystem: false
      },
      {
        id: 'T-1284819',
        title: 'Supply, Installation & Commissioning of Solar Street Lights',
        description: 'New procurement alert matching your electrical/green energy profile published by Dhaka North City Corporation.',
        category: 'Electrical Equipment',
        categoryId: 'Cat-001',
        organization: 'Dhaka North City Corporation',
        organizationId: 'Org-02',
        district: 'Dhaka',
        districtId: 'Loc-01',
        publishedDate: '2026-05-30',
        budget: 'BDT 85 Lakhs',
        method: 'LTM',
        status: 'Live',
        isSystem: false
      },
      {
        id: 'T-4198201',
        title: 'Rehabilitation of Asphalt Road from Airport to Uttara Sector 4',
        description: 'Road infrastructure tender published by Roads and Highways Department matching your location preference (Dhaka).',
        category: 'Road Construction',
        categoryId: 'Cat-060',
        organization: 'Roads and Highways Department',
        organizationId: 'Org-03',
        district: 'Dhaka',
        districtId: 'Loc-01',
        publishedDate: '2026-05-29',
        budget: 'BDT 12.8 Crore',
        method: 'OTM',
        status: 'Live',
        isSystem: false
      }
    ];

    let realMatches: any[] = [];
    if (subPreferences) {
      const { categories, organizations, locations } = subPreferences;
      realMatches = TENDER_NOTICES_DATA.filter(tender => {
        const matchCat = categories.includes(tender.categoryId);
        const matchOrg = organizations.includes(tender.organizationId);
        const matchLoc = locations.includes(tender.districtId);
        return matchCat || matchOrg || matchLoc;
      }).map(tender => ({
        ...tender,
        isSystem: false
      }));
    }

    // Always include dynamic demo alerts merged with preference results so that a rich demo is always pre-loaded
    return realMatches.length > 0 ? [...realMatches, ...demoAlerts] : demoAlerts;
  }, [subPreferences]);

  // Search execute & routing trigger
  const handleSearchSubmit = () => {
    const query = searchQuery.trim();
    if (!query) return;

    // Normalized ID match check
    const normalizedQuery = query.toUpperCase().replace(/^ID-/, 'T-');
    const matched = TENDER_NOTICES_DATA.find(t =>
      t.id.toUpperCase() === normalizedQuery ||
      t.id.toUpperCase().replace('T-', '') === normalizedQuery.replace('T-', '') ||
      t.title.toLowerCase().includes(query.toLowerCase())
    );

    if (matched) {
      navigate(`/tender-notices/${matched.id}`);
    } else {
      navigate(`/tender-notices?search=${encodeURIComponent(query)}`);
    }
    setSearchQuery('');
  };

  // Click outside close handler for Bell Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellDropdownRef.current && !bellDropdownRef.current.contains(event.target as Node)) {
        setIsPcNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <header
            className="relative z-20 flex flex-col justify-end border-b border-[#E5E5E6] bg-[#FFFFFF] px-4 md:px-8 dark:border-white/10 dark:bg-neutral-950 transition-all"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="flex h-16 md:h-20 w-full items-center justify-between py-2 gap-6">
              <div className="shrink-0">
                <h2 className="text-base md:text-lg font-semibold tracking-tight text-[#08090A] dark:text-white">{activeFunction.name}</h2>
                <p className="text-xs md:text-sm font-semibold text-[#8A8F98] dark:text-neutral-500">{activeFunction.statusLabel}</p>
              </div>

              {/* Desktop TopBar Search bar - stretches fully to occupy middle area */}
              <div className="hidden lg:flex flex-1 relative items-center max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-4">
                <input
                  type="text"
                  placeholder="Search Tenders (e.g. 741029)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit();
                    }
                  }}
                  className="h-10 w-full rounded-xl border border-[#E5E5E6] bg-[#FFFFFF] pl-10 pr-4 text-xs text-[#08090A] placeholder-[#8A8F98] shadow-xs outline-none transition-all focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder-neutral-500 dark:focus:border-[#717CFF] font-semibold"
                />
                <Search className="absolute left-3.5 h-4 w-4 text-[#8A8F98] dark:text-neutral-500" strokeWidth={2.4} />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Desktop Bell Notifications Dropdown */}
                <div className="hidden md:block relative" ref={bellDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsPcNotificationsOpen(!isPcNotificationsOpen)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 shadow-sm cursor-pointer relative ${isPcNotificationsOpen
                      ? 'border-[#5E6AD2] bg-[#5E6AD2]/5 text-[#5E6AD2] dark:border-[#717CFF] dark:bg-[#717CFF]/5 dark:text-[#717CFF]'
                      : 'border-[#E5E5E6] bg-[#FFFFFF] text-[#62666D] hover:bg-[#F1F2F4] hover:text-[#08090A] dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
                      }`}
                    title="Tender Alerts"
                  >
                    <Bell className="h-5 w-5" strokeWidth={1.8} />
                    {matchedNotices.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-neutral-950 animate-bounce">
                        {matchedNotices.length}
                      </span>
                    )}
                  </button>

                  {/* PC Bell Dropdown Panel */}
                  {isPcNotificationsOpen && (
                    <div className="absolute right-0 z-50 mt-2.5 w-96 rounded-2xl border border-[#E5E5E6] bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-[#E5E5E6] pb-2.5 mb-3 dark:border-neutral-800">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#08090A] dark:text-white">Tender Alerts ({matchedNotices.length})</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPcNotificationsOpen(false);
                            navigate('/tender-notices');
                          }}
                          className="text-[10px] font-bold text-[#5E6AD2] hover:text-[#5E6AD2]/80 dark:text-[#717CFF] dark:hover:text-[#717CFF]/80 cursor-pointer"
                        >
                          Manage Preferences
                        </button>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                        {matchedNotices.length > 0 ? (
                          matchedNotices.map((notice) => (
                            <div key={notice.id} className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-[#F9FAFB] p-3 dark:border-white/5 dark:bg-white/[0.02] hover:border-neutral-200 dark:hover:border-white/10 transition-colors">
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="text-[9px] font-bold text-[#5E6AD2] dark:text-[#717CFF] bg-[#5E6AD2]/10 dark:bg-[#717CFF]/10 px-2 py-0.5 rounded">
                                  {notice.id.replace('T-', 'ID-')}
                                </span>
                                <span className="text-[9px] font-medium text-[#8A8F98] dark:text-neutral-500">
                                  {notice.publishedDate}
                                </span>
                              </div>

                              <div>
                                <p className="text-xs font-bold text-[#08090A] dark:text-white line-clamp-1">{notice.title}</p>
                                <p className="text-[11px] text-[#62666D] dark:text-neutral-400 line-clamp-2 mt-0.5">{notice.description || notice.category}</p>
                              </div>

                              <div className="flex items-center justify-between border-t border-neutral-100 pt-1.5 mt-1 dark:border-neutral-800">
                                <span className="text-[9px] font-semibold text-[#8A8F98] dark:text-neutral-500 truncate max-w-[180px]">
                                  {notice.organization} ({notice.district})
                                </span>
                                {!notice.isSystem ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsPcNotificationsOpen(false);
                                      navigate(`/tender-notices/${notice.id}`);
                                    }}
                                    className="text-[10px] font-bold text-[#5E6AD2] hover:text-[#5E6AD2]/80 dark:text-[#717CFF] dark:hover:text-[#717CFF]/80 cursor-pointer"
                                  >
                                    View Details &rarr;
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsPcNotificationsOpen(false);
                                      navigate('/tender-notices');
                                    }}
                                    className="text-[10px] font-bold text-[#5E6AD2] hover:text-[#5E6AD2]/80 dark:text-[#717CFF] dark:hover:text-[#717CFF]/80 cursor-pointer"
                                  >
                                    Alert Me &rarr;
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-xs text-[#8A8F98] dark:text-neutral-500">
                            No alerts matching your subscription preferences.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Global Language Switcher Capsule */}
                <div className="flex h-10 items-center rounded-xl border border-[#E5E5E6] bg-[#FFFFFF] p-0.5 dark:border-white/10 dark:bg-white/[0.03] shadow-sm shrink-0">
                  <button
                    type="button"
                    onClick={() => onLangChange('bn')}
                    className={`flex h-8 px-3 items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      lang === 'bn'
                        ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/15 dark:text-[#717CFF]'
                        : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => onLangChange('en')}
                    className={`flex h-8 px-3 items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      lang === 'en'
                        ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/15 dark:text-[#717CFF]'
                        : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    EN
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E5E6] bg-[#FFFFFF] text-[#62666D] transition-colors hover:bg-[#F1F2F4] hover:text-[#08090A] dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer shadow-sm"
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={isDarkMode ? 'Light mode' : 'Dark mode'}
                >
                  {isDarkMode ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M21 12.79A8.5 8.5 0 1 1 11.21 3 6.5 6.5 0 0 0 21 12.79z"
                      />
                    </svg>
                  )}
                </button>

                {/* AI Assistant bordered button - hidden on mobile (placed in bottom navbar) */}
                <button
                  type="button"
                  onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                  className={`hidden md:flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm cursor-pointer whitespace-nowrap ${isAiPanelOpen
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

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E5E6] bg-[#F3F4F6] text-sm font-bold text-[#62666D] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 shadow-sm">
                  AD
                </div>
              </div>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden relative">
            <section className="flex-1 overflow-y-auto bg-[#F7F8F8] p-4 pb-24 md:p-8 md:pb-8 dark:bg-neutral-950">
              <RoutesComponent functions={functions} lang={lang} onLangChange={onLangChange} />
            </section>

            {/* AI Assistant Right Panel */}
            <AiAssistantPanel isOpen={isAiPanelOpen} onClose={() => setIsAiPanelOpen(false)} />
          </div>
        </main>

        {/* Modern Premium Bottom Floating Islands Navbar for Mobile Devices */}
        <nav
          className="fixed bottom-6 left-0 right-0 z-40 flex items-center justify-between w-full max-w-[420px] mx-auto px-3.5 md:hidden animate-fadeIn gap-2.5"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Left Island: Circle - Search (Tender Notices) */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full border border-neutral-200/50 bg-white text-neutral-600 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:text-[#5E6AD2] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-[#717CFF] transition-all transform active:scale-95 cursor-pointer ${isMobileSearchOpen || activeFunctionId === 'tender-notices'
              ? 'text-[#5E6AD2] ring-2 ring-[#5E6AD2]/20 dark:text-[#717CFF] dark:ring-[#717CFF]/20 bg-[#5E6AD2]/5 dark:bg-[#717CFF]/5'
              : ''
              }`}
            title="Search Tenders"
          >
            <Search className="h-[21px] w-[21px]" strokeWidth={2.4} />
          </button>

          {/* Middle Island: Pill - Home, Notifications, Calculator, Hamburger */}
          <div className="flex-1 flex h-[56px] items-center justify-between rounded-full border border-neutral-200/50 bg-white px-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-neutral-900">
            {/* Home button (Dashboard) */}
            <button
              type="button"
              onClick={() => onSelectFunction('dashboard')}
              className={`flex h-[44px] w-[44px] items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${activeFunctionId === 'dashboard'
                ? 'bg-neutral-100/90 text-neutral-900 dark:bg-white/[0.08] dark:text-white font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-50/50 dark:hover:bg-white/[0.02]'
                }`}
              title="Dashboard"
            >
              <Home className="h-[21px] w-[21px]" strokeWidth={2.2} />
            </button>

            {/* Notifications button */}
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className={`flex h-[44px] w-[44px] items-center justify-center rounded-full relative transition-all duration-200 cursor-pointer ${isNotificationsOpen
                ? 'bg-neutral-100/90 text-neutral-900 dark:bg-white/[0.08] dark:text-white'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-50/50 dark:hover:bg-white/[0.02]'
                }`}
              title="Notifications"
            >
              <Bell className="h-[21px] w-[21px]" strokeWidth={2.2} />
              {/* Elegant glowing notification badge indicator */}
              {matchedNotices.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 ring-2 ring-white dark:ring-neutral-900" />
                </span>
              )}
            </button>

            {/* Calculator button (SLT Calculator) */}
            <button
              type="button"
              onClick={() => onSelectFunction('slt-calculator')}
              className={`flex h-[44px] w-[44px] items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${activeFunctionId === 'slt-calculator'
                ? 'bg-neutral-100/90 text-neutral-900 dark:bg-white/[0.08] dark:text-white font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-50/50 dark:hover:bg-white/[0.02]'
                }`}
              title="SLT Calculator"
            >
              <Calculator className="h-[21px] w-[21px]" strokeWidth={2.2} />
            </button>

            {/* Hamburger button (Opens sidebar drawer) */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-all duration-200 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] cursor-pointer"
              title="More Options"
            >
              <Menu className="h-[21px] w-[21px]" strokeWidth={2.2} />
            </button>
          </div>

          {/* Right Island: Circle - AI Assistant with Cute custom Ninja Face Mask Avatar */}
          <button
            type="button"
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
            className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full transition-all transform active:scale-95 cursor-pointer ${isAiPanelOpen
              ? 'bg-gradient-to-tr from-[#5E6AD2] to-[#717CFF] text-white shadow-[0_4px_16px_rgba(94,106,210,0.4)] ring-2 ring-[#5E6AD2]/20 dark:ring-[#717CFF]/20'
              : 'border border-neutral-200/50 bg-white text-neutral-600 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:text-[#5E6AD2] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-white'
              }`}
            title="AI Assistant"
          >
            <Bot className={`h-[24px] w-[24px] ${isAiPanelOpen ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`} strokeWidth={2.2} />
          </button>
        </nav>

        {/* Mobile search overlay drawer modal */}
        {isMobileSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs animate-fadeIn md:hidden">
            {/* Backdrop click dismiss */}
            <div className="absolute inset-0" onClick={() => setIsMobileSearchOpen(false)} />

            <div className="relative w-full max-w-[420px] mx-auto mt-4 px-4 py-3 rounded-2xl border border-neutral-200/50 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-neutral-900/95 animate-slideDown">
              <div className="flex items-center gap-2 animate-fadeIn">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search Tenders (e.g. 741029)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchSubmit();
                        setIsMobileSearchOpen(false);
                      }
                    }}
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-[#FFFFFF] pl-11 pr-4 text-sm text-[#08090A] placeholder-neutral-400 outline-none transition-all focus:border-[#5E6AD2] dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder-neutral-500 font-semibold"
                  />
                  <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-neutral-400 dark:text-neutral-500" strokeWidth={2.4} />
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="text-xs font-bold text-[#5E6AD2] dark:text-[#717CFF] px-2 py-1 cursor-pointer shrink-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Premium Glassmorphic Notifications Slide-up Drawer for Mobile */}
        {isNotificationsOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-fadeIn md:hidden">
            {/* Backdrop click dismiss */}
            <div className="absolute inset-0" onClick={() => setIsNotificationsOpen(false)} />

            <div className="relative w-full rounded-t-3xl border-t border-neutral-200 bg-white/95 p-6 pb-28 shadow-2xl dark:border-white/10 dark:bg-neutral-900/95 animate-slideUp">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700 cursor-pointer" onClick={() => setIsNotificationsOpen(false)} />
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#5E6AD2] dark:text-[#717CFF]" strokeWidth={2} />
                  Tender Alerts & System Notifications
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs font-bold text-[#5E6AD2] hover:text-[#5E6AD2]/80 dark:text-[#717CFF] dark:hover:text-[#717CFF]/80 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {matchedNotices.length > 0 ? (
                  matchedNotices.map((notice) => (
                    <div key={notice.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]">
                          <FileText className="h-4.5 w-4.5" strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5E6AD2] dark:text-[#717CFF]">
                              {notice.id.replace('T-', 'ID-')}
                            </span>
                            <span className="text-[9px] font-medium text-neutral-400">
                              {notice.publishedDate}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-neutral-950 dark:text-white mt-1 leading-snug line-clamp-1">{notice.title}</p>
                          <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                            {notice.description || notice.category}
                          </p>
                          <div className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 mt-1">
                            Org: {notice.organization} &bull; Dist: {notice.district}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end border-t border-neutral-100 pt-2.5 dark:border-white/5">
                        {!notice.isSystem ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              navigate(`/tender-notices/${notice.id}`);
                            }}
                            className="w-full rounded-xl bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 text-white font-extrabold text-xs py-2 text-center shadow-xs transition-colors cursor-pointer"
                          >
                            View Details
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              navigate('/tender-notices');
                            }}
                            className="w-full rounded-xl bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 text-white font-extrabold text-xs py-2 text-center shadow-xs transition-colors cursor-pointer"
                          >
                            Configure Alerts
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-xs text-neutral-500 dark:text-neutral-400">
                    No alerts matching your subscription preferences.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}