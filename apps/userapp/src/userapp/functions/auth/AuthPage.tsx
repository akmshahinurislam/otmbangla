import { useState, useEffect } from 'react';

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

    const interval = setInterval(() => {
      // Calculate how much progress increments per 50ms tick
      const increment = 100 / (totalSteps * (stepDuration / 50));
      currentProgress += increment;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setCurrentStepIndex(totalSteps - 1);
        clearInterval(interval);
        
        // Brief completion hold before switching to dashboard
        setTimeout(() => {
          if (pendingAuthData) {
            onLoginSuccess(pendingAuthData.token, pendingAuthData.user);
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

    return () => clearInterval(interval);
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

    const apiBaseUrl = 'http://localhost:3001/api/auth';

    try {
      if (isLogin) {
        // Login Flow
        if (!formData.phone || !formData.password) {
          throw new Error('Please fill in all fields.');
        }

        const response = await fetch(`${apiBaseUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.phone,
            password: formData.password,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to login.');
        }

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

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to register.');
        }

        setSuccessMsg('Registration successful! Launching setup...');
        
        // Wait briefly for success message before showing the loader
        setTimeout(() => {
          setPendingAuthData({ token: data.token, user: data.user });
          setLoadingType('signup');
          setFakeLoading(true);
        }, 1000);
      }
    } catch (err: any) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8F8] px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-subtle bg-white text-lg font-bold text-[#5E6AD2] shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-[#717CFF]">
            UA
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-[#08090A] dark:text-white font-sans">
            Welcome to UserApp
          </h2>
          <p className="mt-2 text-center text-sm text-[#62666D] dark:text-neutral-400">
            {isLogin ? 'Access your workspace and functions' : 'Create your secure developer workspace'}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E5E5E6] bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-md">
          {/* Tab buttons */}
          <div className="mb-8 flex rounded-lg bg-neutral-100 p-1 dark:bg-white/[0.05]">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccessMsg('');
              }}
              className={`w-1/2 rounded-md py-2 text-xs font-semibold transition-all ${isLogin
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
              className={`w-1/2 rounded-md py-2 text-xs font-semibold transition-all ${!isLogin
                ? 'bg-white text-[#08090A] shadow-sm dark:bg-neutral-800 dark:text-white'
                : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200/50 bg-red-50/50 p-3.5 text-xs font-medium text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 animate-fadeIn">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-3.5 text-xs font-medium text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400 animate-fadeIn">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
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
                  className="peer block w-full rounded-lg border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-3.5 text-xs text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-medium"
                />
                <label
                  htmlFor="name"
                  className="absolute text-xs text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-medium"
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
                className="peer block w-full rounded-lg border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-3.5 text-xs text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-medium"
              />
              <label
                htmlFor="phone"
                className="absolute text-xs text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-medium"
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
                  className="peer block w-full rounded-lg border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-3.5 text-xs text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-medium"
                />
                <label
                  htmlFor="email"
                  className="absolute text-xs text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-medium"
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
                className="peer block w-full rounded-lg border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-3.5 text-xs text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-medium"
              />
              <label
                htmlFor="password"
                className="absolute text-xs text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-medium"
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
                  className="peer block w-full rounded-lg border border-neutral-300 bg-white dark:bg-[#18181b] px-4 py-3.5 text-xs text-[#08090A] outline-none focus:border-blue-600 focus:ring-0 dark:border-white/10 dark:text-white dark:focus:border-blue-500 transition-all font-medium"
                />
                <label
                  htmlFor="confirmPassword"
                  className="absolute text-xs text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-[#18181b] dark:peer-focus:bg-[#18181b] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-blue-600 dark:peer-focus:text-blue-500 transition-all pointer-events-none font-medium"
                >
                  Confirm password
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#5E6AD2] py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#4d59c2] focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50 disabled:opacity-50 dark:bg-[#717CFF] dark:hover:bg-[#5b66e6]"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
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
