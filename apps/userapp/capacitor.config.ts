import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.otmbangla.userapp',
  appName: 'OTM Bangla User App',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    url: 'http://192.168.1.5:5173'
  }
};

export default config;
