
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './',
    server: {
      host: true, // Exposes the app to your local network (0.0.0.0)
      port: 3000, // specific port number
      strictPort: false, // if 3000 is taken, it will try 3001
      open: true, // automatically open the browser
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY),
    }
  };
});
