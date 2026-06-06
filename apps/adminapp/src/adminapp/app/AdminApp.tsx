import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, Award } from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { AuthPage } from '../functions/auth/AuthPage';
import { DashboardPage } from '../functions/dashboard/DashboardPage';
import { UsersPage } from '../functions/users/UsersPage';
import { LeadsPage } from '../functions/leads/LeadsPage';
import { EContractsPage } from '../functions/econtracts/EContractsPage';

export type ThemeMode = 'light' | 'dark';

export interface AdminUser {
  name: string;
  phone: string;
  email: string;
}

export type AdminFunctionId = 'dashboard' | 'users' | 'leads' | 'econtracts';

export interface AdminFunction {
  id: AdminFunctionId;
  name: string;
  description: string;
  statusLabel: string;
  accentClassName: string;
  icon: React.ComponentType<any>;
  Page: (props: any) => JSX.Element;
}

export function AdminApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = window.localStorage.getItem('adminapp-theme');
    return savedTheme === 'dark' ? 'dark' : 'light';
  });

  const [token, setToken] = useState<string | null>(() => {
    return window.localStorage.getItem('adminapp-token');
  });

  const [user, setUser] = useState<AdminUser | null>(() => {
    const savedUser = window.localStorage.getItem('adminapp-user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    window.localStorage.setItem('adminapp-theme', themeMode);
  }, [themeMode]);

  const handleLoginSuccess = useCallback((newToken: string, newUser: AdminUser) => {
    window.localStorage.setItem('adminapp-token', newToken);
    window.localStorage.setItem('adminapp-user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    navigate('/dashboard');
  }, [navigate]);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem('adminapp-token');
    window.localStorage.removeItem('adminapp-user');
    setToken(null);
    setUser(null);
    navigate('/');
  }, [navigate]);

  const functions = useMemo<AdminFunction[]>(() => [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Analytics, KPI distributions, and registration pipelines.',
      statusLabel: 'System Overview',
      accentClassName: 'border-indigo-500/30 text-indigo-600 bg-indigo-500/10 dark:border-indigo-400/20 dark:text-indigo-400 dark:bg-indigo-400/10',
      icon: LayoutDashboard,
      Page: DashboardPage,
    },
    {
      id: 'users',
      name: 'Users',
      description: 'View registered users, modify permissions, and inspect activities.',
      statusLabel: 'User Directories',
      accentClassName: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10 dark:border-emerald-400/20 dark:text-emerald-400 dark:bg-emerald-400/10',
      icon: Users,
      Page: UsersPage,
    },
    {
      id: 'leads',
      name: 'Leads',
      description: 'Track acquisitions, conversion rates, and create new client leads.',
      statusLabel: 'Acquisition Pipeline',
      accentClassName: 'border-amber-500/30 text-amber-600 bg-amber-500/10 dark:border-amber-400/20 dark:text-amber-400 dark:bg-amber-400/10',
      icon: UserCheck,
      Page: LeadsPage,
    },
    {
      id: 'econtracts',
      name: 'eContracts',
      description: 'View awarded contracts, search details, check beneficial ownership, and manage scrapes.',
      statusLabel: 'Notice of Award Records',
      accentClassName: 'border-violet-500/30 text-violet-600 bg-violet-500/10 dark:border-violet-400/20 dark:text-violet-400 dark:bg-violet-400/10',
      icon: Award,
      Page: EContractsPage,
    },
  ], []);

  // Determine the active page based on the route path
  const currentPath = location.pathname.replace(/^\//, '');
  const activeFunctionId = (['dashboard', 'users', 'leads', 'econtracts'].includes(currentPath) ? currentPath : 'dashboard') as AdminFunctionId;
  const activeFunction = functions.find((fn) => fn.id === activeFunctionId) || functions[0];

  if (!token || !user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AppShell
      activeFunction={activeFunction}
      activeFunctionId={activeFunctionId}
      functions={functions}
      onSelectFunction={(id) => navigate('/' + id)}
      onToggleTheme={() => setThemeMode((curr) => (curr === 'light' ? 'dark' : 'light'))}
      themeMode={themeMode}
      onLogout={handleLogout}
      user={user}
    />
  );
}
