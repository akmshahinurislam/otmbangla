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
  const host = getBackendHost();
  return `http://${host}:${port}`;
};
