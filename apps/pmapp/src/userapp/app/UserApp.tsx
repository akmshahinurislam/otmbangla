import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createUserFunctions } from '../functions/registry';
import type { UserFunction, UserFunctionId } from '../functions/types';
import { AppShell } from '../layout/AppShell';
import { AuthPage } from '../functions/auth/AuthPage';
import { DevConsole } from '../shared/DevConsole';

import { ProjectLedgerPage } from '../functions/project-ledger/ProjectLedgerPage';

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

  const [lang, setLang] = useState<'bn' | 'en'>(() => {
    const savedLang = window.localStorage.getItem('userapp-lang');
    return (savedLang === 'en' || savedLang === 'bn') ? savedLang : 'bn';
  });

  useEffect(() => {
    window.localStorage.setItem('userapp-lang', lang);
  }, [lang]);


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
      <ProjectLedgerPage 
        lang={lang} 
        onLangChange={(l) => setLang(l === 'en' ? 'en' : 'bn')} 
        isStandaloneMobileApp={true} 
        user={user}
        onLogout={handleLogout}
      />
      <DevConsole />
    </>
  );
}
