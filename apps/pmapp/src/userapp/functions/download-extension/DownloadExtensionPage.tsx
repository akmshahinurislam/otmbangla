import { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertCircle, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../../shared/config';

export function DownloadExtensionPage() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendMessage, setBackendMessage] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  const aiServiceUrl = getApiUrl(3004);

  const checkHealth = async () => {
    setBackendStatus('checking');
    try {
      const res = await fetch(`${aiServiceUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus('online');
        setBackendMessage(data.service || 'AI Service is running');
      } else {
        setBackendStatus('offline');
        setBackendMessage(`Service returned error ${res.status}`);
      }
    } catch (err) {
      setBackendStatus('offline');
      setBackendMessage('Cannot reach local AI service endpoint');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkHealth();
    setTimeout(() => setIsRetrying(false), 600);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6 px-4 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 dark:border-white/10 dark:bg-neutral-900 shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#5E6AD2]/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-[#717CFF]/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5E6AD2]/10 px-3 py-1 text-xs font-bold text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]">
              PC Companion Feature
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-tight">
              OTMBangla AI Web Companion
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
              Download our browser extension to read, analyze, and query any webpage in real-time. It uses your local workspace GPT API to deliver contextual answers.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 shrink-0">
            <a
              href="/extension.zip"
              download="otmbangla-ai-companion.zip"
              className="flex items-center gap-2 rounded-xl bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 text-white font-extrabold px-6 py-4 shadow-lg hover:shadow-[#5E6AD2]/20 dark:hover:shadow-[#717CFF]/20 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Download className="h-5 w-5" strokeWidth={2.4} />
              <span>Download Extension (.zip)</span>
            </a>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
              V1.0.0 &bull; Compatible with Chrome, Edge, Brave
            </span>
          </div>
        </div>
      </div>

      {/* Connection & Configuration Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/5 dark:bg-neutral-900/60 shadow-md flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Local AI Endpoint</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              The extension connects directly to your backend AI service using a secure local connection. Ensure the workspace is running to process prompts.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
              {aiServiceUrl}
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold">
              Port: 3004
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-white/5 dark:bg-neutral-900/60 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Backend Status</h3>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Refresh connection status"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="my-4">
            {backendStatus === 'checking' && (
              <div className="flex items-center gap-2 text-neutral-500">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
                <span className="text-sm font-bold">Checking connection...</span>
              </div>
            )}
            {backendStatus === 'online' && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
                <span className="text-sm font-bold">Connected & Online</span>
              </div>
            )}
            {backendStatus === 'offline' && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" strokeWidth={2.4} />
                <span className="text-sm font-bold">Offline / Not Connected</span>
              </div>
            )}
            <p className="mt-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
              {backendMessage || 'Resolving local server...'}
            </p>
          </div>

          <div className="text-[10px] text-neutral-400 leading-snug">
            {backendStatus === 'online' 
              ? '✅ OpenAI Gateway is accessible and configured successfully.' 
              : '⚠️ Make sure to run `pnpm dev` or start the `ai-service` container.'
            }
          </div>
        </div>
      </div>

      {/* Installation Guide */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
          <span>Installation Guide</span>
          <ExternalLink className="h-4 w-4 text-neutral-400" />
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1 */}
          <div className="rounded-2xl border border-neutral-100 bg-[#F9FAFB] p-5 dark:border-white/5 dark:bg-white/[0.02] flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5E6AD2]/10 text-xs font-bold text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]">
              1
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Download & Extract</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Click the download button above to retrieve the `otmbangla-ai-companion.zip` file. Extract it to a folder on your computer (e.g., in Documents or Desktop).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-neutral-100 bg-[#F9FAFB] p-5 dark:border-white/5 dark:bg-white/[0.02] flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5E6AD2]/10 text-xs font-bold text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]">
              2
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Open Browser Extensions</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Open Google Chrome (or Edge/Brave) and navigate to <code className="rounded bg-neutral-200 px-1 py-0.5 dark:bg-neutral-800 font-mono text-[10px]">chrome://extensions/</code> in your address bar.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-neutral-100 bg-[#F9FAFB] p-5 dark:border-white/5 dark:bg-white/[0.02] flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5E6AD2]/10 text-xs font-bold text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]">
              3
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Enable Developer Mode</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                In the extensions page, toggle the **Developer Mode** switch in the top right corner. This enables loading custom unpacked extensions.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-2xl border border-neutral-100 bg-[#F9FAFB] p-5 dark:border-white/5 dark:bg-white/[0.02] flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5E6AD2]/10 text-xs font-bold text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]">
              4
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Load Unpacked Folder</h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Click the **Load unpacked** button in the top left corner, then select the folder where you extracted the extension files. Pin the extension for quick access!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Showcase Grid */}
      <div className="rounded-3xl border border-neutral-100 bg-[#F9FAFB] p-8 dark:border-white/5 dark:bg-white/[0.01] space-y-6">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">What can the Companion do?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-neutral-800 dark:text-neutral-200">🔍 Real-time Web Parsing</div>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
              When opened, the companion extracts the text content of your current tab instantly, supporting single-page apps, blogs, or documents.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-neutral-800 dark:text-neutral-200">💬 Context-aware QA</div>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Ask any question about the webpage content. The GPT model analyzes your queries relative to the text on screen, ignoring irrelevant items.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-neutral-800 dark:text-neutral-200">🛡️ API Key Isolation</div>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed">
              No API keys are embedded or exposed in the extension files. It safely routes questions through your workspace AI endpoint.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
