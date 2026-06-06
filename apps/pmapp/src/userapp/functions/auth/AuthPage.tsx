import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { getApiUrl, getBackendHost, setBackendHost } from '../../shared/config';

type AuthPageProps = {
  onLoginSuccess: (token: string, user: { name: string; phone: string; email: string }) => void;
};

// Shorter, simpler loading steps
const LOGIN_STEPS = [
  "Securing server session...",
  "Loading user configurations...",
  "Launching workspace..."
];

const SIGNUP_STEPS = [
  "Creating secure developer account...",
  "Provisioning storage sandbox...",
  "Initializing database collections...",
  "Configuring environment variables...",
  "Deploying security protocols...",
  "Launching your personalized workspace..."
];

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showSettings, setShowSettings] = useState(false);
  const [hostIpInput, setHostIpInput] = useState(() => getBackendHost());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fake Loading States
  const [fakeLoading, setFakeLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadingType, setLoadingType] = useState<'login' | 'signup' | null>(null);
  const [pendingAuthData, setPendingAuthData] = useState<{
    token: string;
    user: { name: string; phone: string; email: string };
  } | null>(null);

  // Progressive fake loading logic
  useEffect(() => {
    if (!fakeLoading || !loadingType) return;

    const steps = loadingType === 'login' ? LOGIN_STEPS : SIGNUP_STEPS;
    const totalSteps = steps.length;
    
    // Duration:
    // Login: 3 steps * 600ms = 1.8 seconds
    // Signup: 6 steps * 1000ms = 6.0 seconds
    const stepDuration = loadingType === 'login' ? 600 : 1000;
    
    let currentProgress = 0;
    setProgress(0);
    setCurrentStepIndex(0);
    console.log(`[AuthPage] Progressive fake loader STARTED for: ${loadingType}. Pending token: ${pendingAuthData?.token ? 'EXISTS' : 'NONE'}`);

    const interval = setInterval(() => {
      // Calculate how much progress increments per 50ms tick
      const increment = 100 / (totalSteps * (stepDuration / 50));
      currentProgress += increment;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setCurrentStepIndex(totalSteps - 1);
        clearInterval(interval);
        console.log(`[AuthPage] Progressive fake loader REACHED 100%. Triggering login success in 500ms...`);
        
        // Brief completion hold before switching to dashboard
        setTimeout(() => {
          if (pendingAuthData) {
            console.log(`[AuthPage] Calling onLoginSuccess now...`);
            onLoginSuccess(pendingAuthData.token, pendingAuthData.user);
          } else {
            console.warn(`[AuthPage] Progressive fake loader completed, but pendingAuthData was NULL!`);
          }
        }, 500);
      } else {
        setProgress(currentProgress);
        // Map current progress to corresponding step index
        const calculatedIndex = Math.min(
          totalSteps - 1,
          Math.floor((currentProgress / 100) * totalSteps)
        );
        setCurrentStepIndex(calculatedIndex);
      }
    }, 50);

    return () => {
      console.log(`[AuthPage] Progressive fake loader Effect CLEANED UP / CANCELLED`);
      clearInterval(interval);
    };
  }, [fakeLoading, loadingType, pendingAuthData, onLoginSuccess]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const apiBaseUrl = `${getApiUrl(3001)}/api/auth`;
    console.log(`[AuthPage] Submitting ${isLogin ? 'Login' : 'Signup'} to: ${apiBaseUrl}`);

    try {
      if (isLogin) {
        // Login Flow
        if (!formData.phone || !formData.password) {
          throw new Error('Please fill in all fields.');
        }

        console.log(`[AuthPage] Sending login request for phone: ${formData.phone}`);
        const response = await fetch(`${apiBaseUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.phone,
            password: formData.password,
          }),
        });

        console.log(`[AuthPage] Login fetch completed. Status: ${response.status} ${response.statusText}`);
        const data = await response.json();
        console.log(`[AuthPage] Login response parsed successfully:`, data);
        if (!response.ok) {
          throw new Error(data.error || 'Failed to login.');
        }

        console.log(`[AuthPage] Login successful! Setting pending auth data and activating fake loading loader...`);
        // Intercept and launch modern loader
        setPendingAuthData({ token: data.token, user: data.user });
        setLoadingType('login');
        setFakeLoading(true);
      } else {
        // Signup Flow
        if (!formData.name || !formData.phone || !formData.email || !formData.password || !formData.confirmPassword) {
          throw new Error('Please fill in all fields.');
        }

        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        console.log(`[AuthPage] Sending signup request for: ${formData.name} / ${formData.phone} / ${formData.email}`);
        const response = await fetch(`${apiBaseUrl}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          }),
        });

        console.log(`[AuthPage] Signup fetch completed. Status: ${response.status} ${response.statusText}`);
        const data = await response.json();
        console.log(`[AuthPage] Signup response parsed successfully:`, data);
        if (!response.ok) {
          throw new Error(data.error || 'Failed to register.');
        }

        setSuccessMsg('Registration successful! Launching setup...');
        console.log(`[AuthPage] Signup successful! Scheduling loading activation in 1 second...`);
        
        // Wait briefly for success message before showing the loader
        setTimeout(() => {
          console.log(`[AuthPage] Signup timeout fired. Setting pending auth data and activating fake loading loader...`);
          setPendingAuthData({ token: data.token, user: data.user });
          setLoadingType('signup');
          setFakeLoading(true);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Auth request failed! Detailed error object:', err);
      console.error(`Attempted API Base URL: ${apiBaseUrl}`);
      console.error(`Current Navigator Online Status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = loadingType === 'login' ? LOGIN_STEPS : SIGNUP_STEPS;

  if (fakeLoading && loadingType) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8F8] px-4 dark:bg-neutral-950 transition-colors duration-300">
        <div className="w-full max-w-sm space-y-6 text-center animate-fadeIn">
          <div className="rounded-2xl border border-[#E5E5E6] bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-md">
            
            {/* Elegant Modern Custom Spinner */}
            <div className="flex justify-center mb-6">
              <div className="relative h-14 w-14">
                {/* Glowing ring underlay */}
                <div className="absolute inset-0 rounded-full border-4 border-neutral-100 dark:border-neutral-800" />
                {/* Active spinner arc */}
                <div className="absolute inset-0 rounded-full border-4 border-t-[#5E6AD2] border-r-transparent border-b-transparent border-l-transparent animate-spin dark:border-t-[#717CFF]" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-[#08090A] dark:text-white mb-2">
              {loadingType === 'login' ? 'Authenticating' : 'Creating Workspace'}
            </h3>
            
            {/* Simple Status Step Text */}
            <p className="text-xs text-[#62666D] dark:text-neutral-400 min-h-[16px] animate-pulse">
              {steps[currentStepIndex]}
            </p>

            {/* Simple Progress Bar */}
            <div className="mt-6 h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#5E6AD2] dark:bg-[#717CFF] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

          </div>
        </div>
      </div>
    );
  }

  const saveHostIp = () => {
    setBackendHost(hostIpInput);
    setShowSettings(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F7F8F8] px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Dynamic IP configuration settings gear for Native Mobile Developers */}
      {Capacitor.isNativePlatform() && (
        <div className="absolute right-4 top-4 z-50">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E5E5E6] bg-white text-neutral-600 shadow-md transition-all hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-400 dark:hover:bg-white/[0.08]"
            title="Developer Settings"
          >
            <svg className="h-6 w-6 animate-[spin_10s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Developer Settings Modal/Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5E5E6] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-xl font-bold text-[#08090A] dark:text-white mb-2">Developer Settings</h3>
            <p className="text-sm text-[#62666D] dark:text-neutral-400 mb-5 leading-relaxed">
              Set your PC's local Wi-Fi IP address so the mobile app can connect to your local microservices backend.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  Local Backend Host / IP
                </label>
                <input
                  type="text"
                  value={hostIpInput}
                  onChange={(e) => setHostIpInput(e.target.value)}
                  placeholder="e.g. 192.168.1.15 or localhost"
                  className="block w-full rounded-xl border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-3.5 text-sm text-[#08090A] outline-none focus:border-blue-600 dark:border-white/10 dark:text-white dark:focus:border-blue-500 font-semibold"
                />
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="rounded-xl border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-600 transition-all hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/[0.02]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveHostIp}
                  className="rounded-xl bg-[#5E6AD2] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#4d59c2] dark:bg-[#717CFF] dark:hover:bg-[#5b66e6]"
                >
                  Save Host IP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-subtle bg-white text-xl font-bold text-[#5E6AD2] shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-[#717CFF]">
            PM
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-[#08090A] dark:text-white font-sans">
            Welcome to PM Companion
          </h2>
          <p className="mt-3 text-center text-base text-[#62666D] dark:text-neutral-400">
            {isLogin ? 'Access your workspace and functions' : 'Create your secure developer workspace'}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E5E6] bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-md">
          {/* Tab buttons */}
          <div className="mb-8 flex rounded-xl bg-neutral-100 p-1.5 dark:bg-white/[0.05]">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccessMsg('');
              }}
              className={`w-1/2 rounded-lg py-3 text-sm font-bold transition-all ${isLogin
                ? 'bg-white text-[#08090A] shadow-sm dark:bg-neutral-800 dark:text-white'
                : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccessMsg('');
              }}
              className={`w-1/2 rounded-lg py-3 text-sm font-bold transition-all ${!isLogin
                ? 'bg-white text-[#08090A] shadow-sm dark:bg-neutral-800 dark:text-white'
                : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200/50 bg-red-50/50 p-4 text-sm font-semibold text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 animate-fadeIn">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4 text-sm font-semibold text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400 animate-fadeIn">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Full Name (Signup Only) */}
            {!isLogin && (
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder=" "
                  value={formData.name}
                  onChange={handleChange}
                  className="peer block w-full rounded-xl border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-4 text-base text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-semibold"
                />
                <label
                  htmlFor="name"
                  className="absolute text-sm text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-semibold"
                >
                  Full Name
                </label>
              </div>
            )}

            {/* Phone / Email */}
            <div className="relative">
              <input
                id="phone"
                name="phone"
                type="text"
                required
                placeholder=" "
                value={formData.phone}
                onChange={handleChange}
                className="peer block w-full rounded-xl border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-4 text-base text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-semibold"
              />
              <label
                htmlFor="phone"
                className="absolute text-sm text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-semibold"
              >
                {isLogin ? 'Email or phone' : 'Phone number'}
              </label>
            </div>

            {/* Email Address (Signup Only) */}
            {!isLogin && (
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder=" "
                  value={formData.email}
                  onChange={handleChange}
                  className="peer block w-full rounded-xl border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-4 text-base text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-semibold"
                />
                <label
                  htmlFor="email"
                  className="absolute text-sm text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-semibold"
                >
                  Email address
                </label>
              </div>
            )}

            {/* Password */}
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder=" "
                value={formData.password}
                onChange={handleChange}
                className="peer block w-full rounded-xl border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-4 text-base text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-semibold"
              />
              <label
                htmlFor="password"
                className="absolute text-sm text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-semibold"
              >
                Password
              </label>
            </div>

            {/* Confirm Password (Signup Only) */}
            {!isLogin && (
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder=" "
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="peer block w-full rounded-xl border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-4 text-base text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-semibold"
                />
                <label
                  htmlFor="confirmPassword"
                  className="absolute text-sm text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-semibold"
                >
                  Confirm password
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5E6AD2] py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-[#4d59c2] focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50 disabled:opacity-50 dark:bg-[#717CFF] dark:hover:bg-[#5b66e6]"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border border-white border-t-transparent" />
              ) : isLogin ? (
                'Access Portal'
              ) : (
                'Register & Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
