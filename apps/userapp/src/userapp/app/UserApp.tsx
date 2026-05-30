import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createUserFunctions } from '../functions/registry';
import type { UserFunction, UserFunctionId } from '../functions/types';
import { AppShell } from '../layout/AppShell';
import { AuthPage } from '../functions/auth/AuthPage';

export type ThemeMode = 'light' | 'dark';

export interface User {
  name: string;
  phone: string;
  email: string;
}

export function UserApp() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = window.localStorage.getItem('userapp-theme');
    return savedTheme === 'dark' ? 'dark' : 'light';
  });

  const [token, setToken] = useState<string | null>(() => {
    return window.localStorage.getItem('userapp-token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = window.localStorage.getItem('userapp-user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // useEffect for theme remains unchanged
  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    window.localStorage.setItem('userapp-theme', themeMode);
  }, [themeMode]);

  const functions = useMemo(() => {
    let registeredFunctions: UserFunction[] = [];

    registeredFunctions = createUserFunctions({
      getFunctions: () => registeredFunctions,
      onOpenFunction: () => {}, // no op; navigation handles opening
    });

    return registeredFunctions;
  }, []);

  // Derive activeFunctionId from current URL path
  const location = useLocation();
  const currentPath = location.pathname.replace(/^\//, '');
  let activeFunctionId = (currentPath || 'dashboard') as UserFunctionId;
  if (currentPath.startsWith('tender-notices/')) {
    activeFunctionId = 'tender-notices';
  }
  const activeFunction = functions.find((item) => item.id === activeFunctionId) ?? functions[0];

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    window.localStorage.setItem('userapp-token', newToken);
    window.localStorage.setItem('userapp-user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    window.localStorage.removeItem('userapp-token');
    window.localStorage.removeItem('userapp-user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AppShell
      activeFunction={activeFunction}
      activeFunctionId={activeFunctionId}
      functions={functions}
      onSelectFunction={() => {}}
      onToggleTheme={() => setThemeMode((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))}
      themeMode={themeMode}
      onLogout={handleLogout}
      user={user}
    />
  );
}

