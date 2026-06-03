import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { getApiUrl, getBackendHost } from './config';

export interface DevLog {
  id: string;
  type: 'log' | 'warn' | 'error' | 'system';
  message: string;
  timestamp: Date;
  details?: string;
}

// Global state for logs to survive component re-renders
let globalLogs: DevLog[] = [];
const listeners = new Set<(logs: DevLog[]) => void>();

const addLog = (type: 'log' | 'warn' | 'error' | 'system', message: string, details?: string) => {
  const newLog: DevLog = {
    id: Math.random().toString(36).substring(2, 9),
    type,
    message,
    timestamp: new Date(),
    details,
  };
  globalLogs = [...globalLogs, newLog].slice(-300); // Limit to last 300 logs
  listeners.forEach((listener) => listener(globalLogs));
};

// Global interceptor setup (Only once)
if (typeof window !== 'undefined' && !(window as any).__DEV_CONSOLE_INTERCEPTED__) {
  (window as any).__DEV_CONSOLE_INTERCEPTED__ = true;

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    originalLog.apply(console, args);
    const msg = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg))).join(' ');
    addLog('log', msg);
  };

  console.warn = (...args: any[]) => {
    originalWarn.apply(console, args);
    const msg = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg))).join(' ');
    addLog('warn', msg);
  };

  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    const msg = args.map((arg) => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\nStack: ${arg.stack}`;
      }
      return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
    }).join(' ');
    addLog('error', msg);
  };

  window.onerror = (message, source, lineno, colno, error) => {
    const errorDetails = error
      ? `${error.name}: ${error.message}\nStack: ${error.stack}`
      : `Source: ${source}:${lineno}:${colno}`;
    addLog('error', `Global Uncaught Exception: ${message}`, errorDetails);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorDetails = reason instanceof Error 
      ? `${reason.name}: ${reason.message}\nStack: ${reason.stack}` 
      : typeof reason === 'object' ? JSON.stringify(reason, null, 2) : String(reason);
    addLog('error', `Unhandled Promise Rejection: ${reason?.message || String(reason)}`, errorDetails);
  });

  // Log system information
  setTimeout(() => {
    addLog('system', `DevConsole initialized! Running on platform: ${Capacitor.getPlatform()}`);
    addLog('system', `Device status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'} | Configured host: ${getBackendHost()}`);
  }, 500);

  // Intercept all fetch requests globally
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url || '';
    const method = init?.method || 'GET';
    let bodyStr = '';
    if (init?.body) {
      try {
        bodyStr = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
      } catch {
        bodyStr = '[Unparseable body]';
      }
    }
    const logBody = bodyStr ? ` | Body: ${bodyStr.slice(0, 300)}` : '';
    addLog('system', `🌐 [FETCH REQ] ${method} ${url}${logBody}`);

    const startTime = Date.now();
    try {
      const response = await originalFetch(input, init);
      const clonedResponse = response.clone();
      const duration = Date.now() - startTime;
      let resText = '';
      try {
        resText = await clonedResponse.text();
      } catch {
        resText = '[Unreadable body]';
      }
      const snippet = resText.length > 500 ? resText.slice(0, 500) + '...' : resText;
      addLog('system', `🌐 [FETCH RES] ${method} ${url} | Status: ${response.status} (${response.statusText}) | Time: ${duration}ms | Response: ${snippet}`);
      return response;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      addLog('error', `🌐 [FETCH ERR] ${method} ${url} | Failed in ${duration}ms | Error: ${err.message || String(err)}`, err.stack);
      throw err;
    }
  };
}

export function DevConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DevLog[]>(globalLogs);
  const [filter, setFilter] = useState<'all' | 'log' | 'warn' | 'error' | 'system'>('all');
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleLogsUpdate = (updatedLogs: DevLog[]) => {
      setLogs(updatedLogs);
    };
    listeners.add(handleLogsUpdate);
    return () => {
      listeners.delete(handleLogsUpdate);
    };
  }, []);

  // Auto scroll to bottom when new logs arrive if open
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const clearLogs = () => {
    globalLogs = [];
    setLogs([]);
    addLog('system', 'Logs cleared by developer.');
  };

  const copyToClipboard = async () => {
    const formattedLogs = logs
      .map((log) => {
        const time = log.timestamp.toLocaleTimeString();
        const header = `[${time}] [${log.type.toUpperCase()}] ${log.message}`;
        const details = log.details ? `\nDetails:\n${log.details}\n` : '';
        return `${header}${details}`;
      })
      .join('\n\n');

    const output = `### DEV CONSOLE LOGS (${new Date().toLocaleString()})
Platform: ${Capacitor.getPlatform()}
Host IP: ${getBackendHost()}
Online Status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}

\`\`\`text
${formattedLogs}
\`\`\``;

    try {
      await navigator.clipboard.writeText(output);
      addLog('system', 'Copied all logs to clipboard successfully!');
    } catch (err) {
      addLog('error', 'Could not copy logs automatically. Please inspect raw logs instead.');
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    const host = getBackendHost();
    const testUrl = `${getApiUrl(3001)}/api/auth/login`; // Try the auth login endpoint with a ping
    addLog('system', `DIAGNOSTICS: Initiating connection test to Auth Service at ${testUrl}...`);

    const startTime = Date.now();
    try {
      // Perform a clean ping with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 sec timeout

      addLog('system', `DIAGNOSTICS: Sending fetch request (6s timeout) to: ${testUrl}`);
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: 'ping_test', password: 'ping' }), // dummy payload
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      addLog('system', `DIAGNOSTICS: Received response in ${duration}ms! Status: ${response.status} (${response.statusText})`);
      
      const bodyText = await response.text();
      addLog('system', `DIAGNOSTICS: Raw response body snippet: ${bodyText.slice(0, 150)}`);
      
      if (response.status === 400 || response.status === 401 || response.status === 404 || response.status === 200) {
        addLog('system', `SUCCESS: Host is REACHABLE! The backend was successfully reached on port 3001.`);
      } else {
        addLog('warn', `WARNING: Reached server but it returned an unexpected status code.`);
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      let errorMsg = err.message || String(err);
      let detailMsg = '';

      if (err.name === 'AbortError') {
        errorMsg = 'Timeout occurred (Host did not respond in 6 seconds)';
        detailMsg = `This usually indicates a FIREWALL blocking port 3001 on the PC, or the phone and PC being on different isolation subnets, or the backend service is NOT running.`;
      } else if (errorMsg.toLowerCase().includes('failed to fetch')) {
        detailMsg = `Capacitor Network Error: Connection refused or dropped.\nPossible reasons:\n1. Windows Defender Firewall on your PC is blocking incoming traffic on port 3001.\n2. The Docker container is not binding to 0.0.0.0 (it might be listening only on localhost/127.0.0.1).\n3. Your phone and PC cannot route packets to each other (check router client isolation).`;
      }

      addLog('error', `DIAGNOSTICS FAILED in ${duration}ms: ${errorMsg}`, `Error properties:\n${JSON.stringify({
        name: err.name,
        message: err.message,
        stack: err.stack,
        cause: err.cause ? String(err.cause) : undefined
      }, null, 2)}\n\nDiagnosis Guide:\n${detailMsg || 'Investigate server connection and firewall rules.'}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.type !== filter) return false;
    if (search.trim() === '') return true;
    return (
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const getLogColorClass = (type: DevLog['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warn':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'system':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-neutral-300 bg-neutral-800/50 border-neutral-700/50';
    }
  };

  const errorCount = logs.filter((l) => l.type === 'error').length;

  return (
    <>
      {/* Floating launcher badge always on top */}
      <div className="fixed bottom-4 left-4 z-[9999]">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 shadow-xl transition-all active:scale-95 ${
            errorCount > 0 ? 'ring-2 ring-red-500/50 border-red-500/40' : 'hover:bg-neutral-800'
          }`}
        >
          <svg className={`h-5.5 w-5.5 text-neutral-300 ${isOpen ? 'rotate-90' : ''} transition-transform duration-200`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {errorCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white animate-pulse">
              {errorCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex flex-col justify-end bg-black/60 backdrop-blur-xs font-mono">
          <div className="flex h-[80vh] w-full flex-col border-t border-neutral-800 bg-[#0F1012] text-neutral-200 shadow-2xl animate-slideUp">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 bg-[#16181C] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <h4 className="text-xs font-black tracking-widest text-neutral-300 uppercase">
                  [TEMP] DEV CONSOLE
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Actions and Stats Bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 bg-[#131518] px-4 py-2 text-xs">
              <button
                type="button"
                onClick={testConnection}
                disabled={testingConnection}
                className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {testingConnection ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Testing...
                  </>
                ) : (
                  '⚡ Test Backend Ping'
                )}
              </button>
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-1 rounded bg-neutral-800 px-3 py-1.5 font-bold text-neutral-300 transition hover:bg-neutral-700"
              >
                📋 Copy All Logs
              </button>
              <button
                type="button"
                onClick={clearLogs}
                className="flex items-center gap-1 rounded bg-red-950/40 border border-red-900/40 px-3 py-1.5 font-bold text-red-400 transition hover:bg-red-900/40"
              >
                🗑️ Clear
              </button>
              <div className="ml-auto text-[10px] text-neutral-500 font-semibold">
                IP: <span className="text-neutral-300 font-bold">{getBackendHost()}</span>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col gap-2 border-b border-neutral-800 bg-[#111315] px-4 py-2.5">
              {/* Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto text-[11px] font-bold">
                {(['all', 'log', 'warn', 'error', 'system'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilter(type)}
                    className={`rounded px-3 py-1 capitalize transition ${
                      filter === type
                        ? 'bg-neutral-200 text-neutral-950'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    {type === 'all' ? 'All Logs' : `${type}s`}
                  </button>
                ))}
              </div>
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter logs by keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-700"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Logs Viewport */}
            <div className="flex-1 overflow-y-auto bg-[#0a0b0d] p-3 space-y-1.5 text-xs">
              {filteredLogs.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-neutral-600 italic">
                  No logs found matching filters.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const time = log.timestamp.toLocaleTimeString();

                  return (
                    <div
                      key={log.id}
                      className={`rounded border px-3 py-2 transition-colors cursor-pointer ${getLogColorClass(
                        log.type
                      )}`}
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="break-all font-semibold select-text">
                          <span className="mr-1.5 font-normal text-neutral-500">[{time}]</span>
                          {log.message}
                        </div>
                        {log.details && (
                          <span className="text-[10px] underline shrink-0 font-bold opacity-80 mt-0.5">
                            {isExpanded ? 'Hide Stack' : 'Show Stack'}
                          </span>
                        )}
                      </div>

                      {log.details && isExpanded && (
                        <div className="mt-2.5 border-t border-neutral-800 pt-2 text-[10px] select-text">
                          <pre className="overflow-x-auto rounded bg-black/40 p-2.5 text-neutral-400 whitespace-pre-wrap leading-relaxed">
                            {log.details}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
