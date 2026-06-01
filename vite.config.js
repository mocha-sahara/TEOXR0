import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true // Permits deployment and preview domain proxies down to the sandbox
  }
});
