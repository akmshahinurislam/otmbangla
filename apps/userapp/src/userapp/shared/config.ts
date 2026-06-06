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
  const isProd = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : process.env.NODE_ENV === 'production';
  
  if (isProd) {
    switch (port) {
      case 3001:
        return 'https://otmbangla-auth-service.onrender.com';
      case 3002:
        return 'https://otmbangla-api-gateway.onrender.com';
      case 3003:
        return 'https://otmbangla-webscrap-service.onrender.com';
      case 3004:
        return 'https://otmbangla-ai-service.onrender.com';
      case 8000:
      case 8001:
        return 'https://otmbangla-analysis-service.onrender.com';
    }
  }

  const host = getBackendHost();
  return `http://${host}:${port}`;
};
