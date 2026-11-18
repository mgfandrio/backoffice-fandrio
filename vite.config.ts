import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  server: { port: 5174 },
  // ExcelJS n'est chargé qu'à l'export : le pré-optimiser évite un rechargement de page en dev
  optimizeDeps: { include: ['exceljs'] },
});
