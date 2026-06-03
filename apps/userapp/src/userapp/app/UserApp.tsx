import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createUserFunctions } from '../functions/registry';
import type { UserFunction, UserFunctionId } from '../functions/types';
import { AppShell } from '../layout/AppShell';
import { AuthPage } from '../functions/auth/AuthPage';
import { DevConsole } from '../shared/DevConsole';

export type ThemeMode = 'light' | 'dark';

export interface User {
  name: string;
  phone: string;
  email: string;
}

export function UserApp() {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = window.localStorage.getItem('userapp-theme');
    return savedTheme === 'dark' ? 'dark' : 'light';
  });

  const [token, setToken] = useState<string | null>(() => {
    const t = window.localStorage.getItem('userapp-token');
    console.log(`[UserApp] Initial token loaded from localStorage: ${t ? 'EXISTS' : 'NONE'}`);
    return t;
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = window.localStorage.getItem('userapp-user');
    console.log(`[UserApp] Initial user loaded from localStorage: ${savedUser ? savedUser : 'NONE'}`);
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      console.error('[UserApp] Failed to parse saved user from localStorage:', err);
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
      onOpenFunction: (functionId) => {
        navigate('/' + functionId);
      },
    });

    return registeredFunctions;
  }, [navigate]);

  // Derive activeFunctionId from current URL path
  const location = useLocation();
  const currentPath = location.pathname.replace(/^\//, '');
  let activeFunctionId = (currentPath || 'dashboard') as UserFunctionId;
  if (currentPath.startsWith('tender-notices/')) {
    activeFunctionId = 'tender-notices';
  }
  const activeFunction = functions.find((item) => item.id === activeFunctionId) ?? functions[0];

  const handleLoginSuccess = useCallback((newToken: string, newUser: User) => {
    console.log('[UserApp] handleLoginSuccess triggered with:', { token: newToken ? 'EXISTS' : 'NONE', user: newUser });
    window.localStorage.setItem('userapp-token', newToken);
    window.localStorage.setItem('userapp-user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const handleLogout = useCallback(() => {
    console.log('[UserApp] handleLogout triggered');
    window.localStorage.removeItem('userapp-token');
    window.localStorage.removeItem('userapp-user');
    setToken(null);
    setUser(null);
  }, []);

  console.log(`[UserApp] Render state - Has Token: ${!!token}, Has User: ${!!user}`);

  if (!token || !user) {
    return (
      <>
        <AuthPage onLoginSuccess={handleLoginSuccess} />
        <DevConsole />
      </>
    );
  }

  return (
    <>
      <AppShell
        activeFunction={activeFunction}
        activeFunctionId={activeFunctionId}
        functions={functions}
        onSelectFunction={(functionId) => navigate('/' + functionId)}
        onToggleTheme={() => setThemeMode((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))}
        themeMode={themeMode}
        onLogout={handleLogout}
        user={user}
      />
      <DevConsole />
    </>
  );
}

