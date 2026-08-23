import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const m = (f) => path.resolve(here, '..', 'smoke', 'mocks', f).split(path.sep).join('/');

// Mismo juego de mocks que el smoke: sin Firebase real, sin login.
export default defineConfig({
  root: here,
  base: './',
  resolve: {
    alias: [
      { find: /^firebase\/app$/, replacement: m('firebase-app.js') },
      { find: /^firebase\/auth$/, replacement: m('firebase-auth.js') },
      { find: /^firebase\/firestore$/, replacement: m('firebase-firestore.js') },
      { find: /^firebase\/storage$/, replacement: m('firebase-storage.js') },
      { find: /^html2canvas$/, replacement: m('html2canvas.js') },
      { find: /^\.{1,2}(\/\.\.)*\/context\/AuthContext$/, replacement: m('AuthContext.jsx') },
    ],
  },
  plugins: [react()],
  build: { outDir: path.resolve(here, 'out'), emptyOutDir: true },
});
