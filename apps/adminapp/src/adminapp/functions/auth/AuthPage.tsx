import { useState, useEffect } from 'react';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

type AuthPageProps = {
  onLoginSuccess: (token: string, user: { name: string; phone: string; email: string }) => void;
};

const LOADER_STEPS = [
  "Securing administrator session...",
  "Loading dashboard telemetry...",
  "Synthesizing CRM analytics...",
  "Spawning control console..."
];

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fake Loading States
  const [fakeLoading, setFakeLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Progressive fake loading logic
  useEffect(() => {
    if (!fakeLoading) return;

    const totalSteps = LOADER_STEPS.length;
    const stepDuration = 650; // ms per step
    let currentProgress = 0;
    setProgress(0);
    setCurrentStepIndex(0);

    const interval = setInterval(() => {
      const increment = 100 / (totalSteps * (stepDuration / 50));
      currentProgress += increment;

      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setCurrentStepIndex(totalSteps - 1);
        clearInterval(interval);
        
        setTimeout(() => {
          onLoginSuccess('mock-admin-session-token', {
            name: 'Akm Shahinur Islam',
            phone: '01711006879',
            email: 'akmshahinurislam@otmbangla.com'
          });
        }, 400);
      } else {
        setProgress(currentProgress);
        const calculatedIndex = Math.min(
          totalSteps - 1,
          Math.floor((currentProgress / 100) * totalSteps)
        );
        setCurrentStepIndex(calculatedIndex);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [fakeLoading, onLoginSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please provide all credentials.');
      return;
    }

    if (trimmedUser === 'akmshahinurislam' && trimmedPass === '01711006879') {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setFakeLoading(true);
      }, 500);
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  if (fakeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-bg px-4 dark:bg-neutral-950 transition-colors duration-300">
        <div className="w-full max-w-sm space-y-6 text-center animate-fadeIn">
          <div className="rounded-2xl border border-subtle bg-primary-bg p-8 shadow-xl dark:border-white/10 dark:bg-white/[0.02]">
            
            {/* Elegant Modern Custom Spinner */}
            <div className="flex justify-center mb-6">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-4 border-neutral-100 dark:border-neutral-800" />
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin dark:border-t-indigo-400" />
              </div>
            </div>

            <h3 className="text-base font-bold text-main dark:text-white mb-2">
              Authenticating Credentials
            </h3>
            
            <p className="text-xs text-secondary dark:text-neutral-400 min-h-[16px] animate-pulse font-medium">
              {LOADER_STEPS[currentStepIndex]}
            </p>

            {/* Progress Bar */}
            <div className="mt-6 h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-650 dark:bg-indigo-450 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-secondary-bg px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8 transition-colors duration-300">
      
      {/* Absolute Decorative Background gradients */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/5" />

      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        
        {/* Branding Header */}
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-subtle bg-primary-bg text-indigo-600 shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:text-indigo-400">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-main dark:text-white font-sans">
            Admin Console
          </h2>
          <p className="mt-2 text-center text-sm text-secondary dark:text-neutral-400 font-semibold">
            Sign in to manage users, pipelines, and settings.
          </p>
        </div>

        {/* Login Form */}
        <div className="overflow-hidden rounded-2xl border border-subtle bg-primary-bg p-8 shadow-xl dark:border-white/10 dark:bg-white/[0.02] dark:backdrop-blur-md">
          
          {error && (
            <div className="mb-6 rounded-xl border border-red-200/50 bg-red-50/50 p-4 text-xs font-bold text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400 animate-fadeIn flex items-center gap-2.5">
              <svg className="h-4.5 w-4.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="relative">
              <input
                id="username"
                type="text"
                required
                placeholder=" "
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="peer block w-full rounded-xl border border-neutral-300 bg-primary-bg dark:bg-[#121824] px-4 py-3.5 text-sm text-main outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 transition-all font-bold"
              />
              <label
                htmlFor="username"
                className="absolute text-xs text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-primary-bg dark:bg-[#121824] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-indigo-650 dark:peer-focus:text-indigo-450 transition-all pointer-events-none font-bold"
              >
                Username
              </label>
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer block w-full rounded-xl border border-neutral-300 bg-primary-bg dark:bg-[#121824] pr-12 pl-4 py-3.5 text-sm text-main outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 dark:border-white/10 dark:text-white dark:focus:border-indigo-400 transition-all font-bold"
              />
              <label
                htmlFor="password"
                className="absolute text-xs text-neutral-400 dark:text-neutral-500 duration-150 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-primary-bg dark:bg-[#121824] px-1.5 left-3 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-indigo-650 dark:peer-focus:text-indigo-450 transition-all pointer-events-none font-bold"
              >
                Password
              </label>
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-main dark:text-neutral-500 dark:hover:text-white cursor-pointer transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-550/50 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600 cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border border-white border-t-transparent" />
              ) : (
                'Secure Authentication'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
