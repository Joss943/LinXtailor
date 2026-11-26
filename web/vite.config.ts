import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Interface servie sur localhost uniquement (l'agent refuse toute autre origine).
export default defineConfig({
  plugins: [react()],
  server: { host: 'localhost', port: 5173, strictPort: true },
  preview: { host: 'localhost', port: 5173, strictPort: true },
});
