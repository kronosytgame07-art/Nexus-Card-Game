import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexuscardarena.app',
  appName: 'Nexus Card Arena',
  webDir: 'dist',
  backgroundColor: '#050d0d',
  android: {
    backgroundColor: '#050d0d',
  },
  ios: {
    backgroundColor: '#050d0d',
    contentInset: 'always',
  },
};

export default config;
