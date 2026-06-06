import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, Bell, Sun, Moon, Home, Users, UserCheck } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { RoutesComponent } from './Routes';
import type { ThemeMode, AdminFunction, AdminFunctionId, AdminUser } from '../app/AdminApp';

// Define initial high-fidelity leads data
const INITIAL_LEADS = [
  {
    id: 'L-101',
    name: 'Bashundhara Group (Sajid)',
    email: 'sajid@bashundharagroup.com',
    phone: '01819284728',
    source: 'Website',
    value: 450000,
    status: 'Converted',
    date: '2026-05-28',
    lastContact: 'Signed agreement for cement supply.'
  },
  {
    id: 'L-102',
    name: 'Concord Enterprise',
    email: 'tenders@concordgroupbd.com',
    phone: '01711293847',
    source: 'Referral',
    value: 1200000,
    status: 'In Progress',
    date: '2026-05-30',
    lastContact: 'Sent draft proposal for steel structural supply.'
  },
  {
    id: 'L-103',
    name: 'Mir Akhter Limited',
    email: 'mir.akhter@gmail.com',
    phone: '01912837465',
    source: 'Direct',
    value: 850000,
    status: 'Contacted',
    date: '2026-06-01',
    lastContact: 'Introductory phone call completed. Meeting next Sunday.'
  },
  {
    id: 'L-104',
    name: 'Ananta Developments',
    email: 'purchasing@ananta.com.bd',
    phone: '01612847291',
    source: 'Facebook',
    value: 300000,
    status: 'New',
    date: '2026-06-02',
    lastContact: 'Lead captured from Facebook Lead Gen form.'
  },
  {
    id: 'L-105',
    name: 'Navana Construction',
    email: 'navana.const@navana.com',
    phone: '01511982736',
    source: 'Website',
    value: 1500000,
    status: 'In Progress',
    date: '2026-05-25',
    lastContact: 'Reviewing pricing quotes for high-grade asphalt supply.'
  },
  {
    id: 'L-106',
    name: 'Summit Power Ltd',
    email: 'contracts@summitpower.com',
    phone: '01722837462',
    source: 'Direct',
    value: 2500000,
    status: 'Converted',
    date: '2026-05-15',
    lastContact: 'Payment received for generators installation tender.'
  },
  {
    id: 'L-107',
    name: 'BSRM Logistics',
    email: 'logistics@bsrm.com',
    phone: '01911928374',
    source: 'Referral',
    value: 650000,
    status: 'Lost',
    date: '2026-05-20',
    lastContact: 'Client opted for a cheaper competitor proposal.'
  }
];

type AppShellProps = {
  activeFunction: AdminFunction;
  activeFunctionId: AdminFunctionId;
  functions: AdminFunction[];
  onSelectFunction: (functionId: AdminFunctionId) => void;
  onToggleTheme: () => void;
  themeMode: ThemeMode;
  onLogout: () => void;
  user: AdminUser;
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
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Leads and Stats state
  const [leadsList, setLeadsList] = useState(() => {
    const savedLeads = window.localStorage.getItem('adminapp-leads');
    return savedLeads ? JSON.parse(savedLeads) : INITIAL_LEADS;
  });

  // Sync leads list to localStorage
  useEffect(() => {
    window.localStorage.setItem('adminapp-leads', JSON.stringify(leadsList));
  }, [leadsList]);

  // Derive stats dynamically based on lead updates
  const leadStats = useMemo(() => {
    let totalValue = 0;
    let convertedCount = 0;
    let lostCount = 0;
    let inProgressCount = 0;
    let newCount = 0;
    let contactedCount = 0;

    leadsList.forEach((lead: any) => {
      if (lead.status === 'Converted') {
        convertedCount++;
        totalValue += lead.value;
      } else if (lead.status === 'Lost') {
        lostCount++;
      } else if (lead.status === 'In Progress') {
        inProgressCount++;
      } else if (lead.status === 'New') {
        newCount++;
      } else if (lead.status === 'Contacted') {
        contactedCount++;
      }
    });

    return {
      totalLeads: leadsList.length,
      convertedCount,
      lostCount,
      inProgressCount,
      newCount,
      contactedCount,
      totalValue,
    };
  }, [leadsList]);

  const handleCreateLead = (newLead: any) => {
    const leadWithId = {
      ...newLead,
      id: `L-${Date.now().toString().slice(-3)}`,
      date: new Date().toISOString().split('T')[0],
    };
    setLeadsList((curr: any) => [leadWithId, ...curr]);
  };

  const handleUpdateLeadStatus = (leadId: string, newStatus: string) => {
    setLeadsList((curr: any) =>
      curr.map((l: any) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
  };

  const handleSearchSubmit = () => {
    const query = searchQuery.trim();
    if (!query) return;

    if (activeFunctionId !== 'users' && activeFunctionId !== 'leads') {
      navigate('/leads?search=' + encodeURIComponent(query));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-secondary-bg font-sans text-main dark:bg-neutral-950 dark:text-neutral-100 transition-colors duration-300">
      
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeFunctionId={activeFunctionId}
        functions={functions}
        onSelectFunction={onSelectFunction}
        onLogout={onLogout}
        user={user}
        isMobileOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Panel */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        
        {/* Main Header */}
        <header
          className="relative z-20 flex flex-col justify-end border-b border-subtle bg-primary-bg px-4 md:px-8 dark:border-white/10 dark:bg-neutral-950 transition-all duration-300"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex h-16 md:h-20 w-full items-center justify-between py-2 gap-6">
            <div>
              <h2 className="text-base md:text-lg font-bold tracking-tight text-main dark:text-white">
                {activeFunction.name}
              </h2>
              <p className="text-[10px] md:text-xs font-semibold text-muted dark:text-neutral-500">
                {activeFunction.statusLabel}
              </p>
            </div>

            {/* Desktop Header Search */}
            <div className="hidden lg:flex flex-1 relative items-center max-w-md xl:max-w-lg mx-4">
              <input
                type="text"
                placeholder="Search resources, leads, or logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit();
                }}
                className="h-10 w-full rounded-xl border border-subtle bg-primary-bg pl-10 pr-4 text-xs text-main placeholder-muted shadow-xs outline-none transition-all focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder-neutral-500 dark:focus:border-indigo-400 font-bold"
              />
              <Search className="absolute left-3.5 h-4 w-4 text-muted dark:text-neutral-500" strokeWidth={2.4} />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              
              {/* Notification Bell (Visual Only) */}
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-primary-bg text-secondary hover:bg-hover-surface hover:text-main dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer shadow-xs transition-all relative group"
                title="System Notifications"
              >
                <Bell className="h-4.5 w-4.5 group-hover:animate-bell-shake" />
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-primary-bg text-secondary hover:bg-hover-surface hover:text-main dark:border-white/10 dark:bg-white/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white cursor-pointer shadow-xs transition-all"
                aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>

              {/* User Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-subtle bg-tertiary-surface text-xs font-bold text-secondary dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 shadow-xs">
                {user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'AD'}
              </div>
            </div>
          </div>
        </header>

        {/* View Layout Workspace */}
        <div className="flex flex-1 overflow-hidden relative">
          <section className="flex-1 overflow-y-auto bg-secondary-bg p-4 pb-24 md:p-8 md:pb-8 dark:bg-neutral-950 transition-colors duration-300">
            <RoutesComponent
              functions={functions}
              leadStats={leadStats}
              leadsList={leadsList}
              onCreateLead={handleCreateLead}
              onUpdateLeadStatus={handleUpdateLeadStatus}
            />
          </section>
        </div>
      </main>

      {/* Floating Island Mobile Bottom Navbar */}
      <nav
        className="fixed bottom-6 left-0 right-0 z-40 flex items-center justify-between w-full max-w-[320px] mx-auto px-4 md:hidden animate-fadeIn"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex w-full h-[56px] items-center justify-around rounded-full border border-neutral-200/50 bg-white/95 px-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-neutral-900/95 dark:backdrop-blur-md">
          {/* Dashboard Page */}
          <button
            type="button"
            onClick={() => onSelectFunction('dashboard')}
            className={`flex h-[40px] w-[40px] items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
              activeFunctionId === 'dashboard'
                ? 'bg-indigo-50/80 text-indigo-650 dark:bg-white/[0.08] dark:text-indigo-400 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
            title="Dashboard"
          >
            <Home className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </button>

          {/* Users Page */}
          <button
            type="button"
            onClick={() => onSelectFunction('users')}
            className={`flex h-[40px] w-[40px] items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
              activeFunctionId === 'users'
                ? 'bg-indigo-50/80 text-indigo-650 dark:bg-white/[0.08] dark:text-indigo-400 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
            title="Users"
          >
            <Users className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </button>

          {/* Leads Page */}
          <button
            type="button"
            onClick={() => onSelectFunction('leads')}
            className={`flex h-[40px] w-[40px] items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
              activeFunctionId === 'leads'
                ? 'bg-indigo-50/80 text-indigo-650 dark:bg-white/[0.08] dark:text-indigo-400 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
            title="Leads"
          >
            <UserCheck className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </button>

          {/* Menu Drawer toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-[40px] w-[40px] items-center justify-center rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-all duration-200 cursor-pointer"
            title="Open Menu"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </button>
        </div>
      </nav>
    </div>
  );
}
