import { Capacitor } from '@capacitor/core';

// Save and retrieve custom backend host IP from localStorage for easy configuration on the go
export const getBackendHost = (): string => {
  if (!Capacitor.isNativePlatform()) {
    return 'localhost';
  }
  return localStorage.getItem('mobile-backend-host') || '192.168.1.100'; // Default fallback local IP
};

export const setBackendHost = (ip: string) => {
  localStorage.setItem('mobile-backend-host', ip.trim());
};

// Map each port to its absolute endpoint URL based on environment
export const getApiUrl = (port: number): string => {
  const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
  
  if (isProd) {
    const env = (import.meta as any).env || {};
    switch (port) {
      case 3001:
        return env.VITE_AUTH_SERVICE_URL || 'https://otmbangla-auth-service.onrender.com';
      case 3002:
        return env.VITE_API_GATEWAY_URL || 'https://otmbangla-api-gateway.onrender.com';
      case 3003:
        return env.VITE_WEBSCRAP_SERVICE_URL || 'https://otmbangla-webscrap-service.onrender.com';
      case 3004:
        return env.VITE_AI_SERVICE_URL || 'https://otmbangla-ai-service.onrender.com';
      case 8000:
      case 8001:
        return env.VITE_ANALYSIS_SERVICE_URL || 'https://otmbangla-analysis-service.onrender.com';
    }
  }

  const host = getBackendHost();
  return `http://${host}:${port}`;
};
