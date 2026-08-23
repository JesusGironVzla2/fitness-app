import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const m = (f) => path.resolve(here, 'mocks', f).split(path.sep).join('/');

export default defineConfig({
  root: path.resolve(here, '..', '..'),
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^firebase\/app$/, replacement: m('firebase-app.js') },
      { find: /^firebase\/auth$/, replacement: m('firebase-auth.js') },
      { find: /^firebase\/firestore$/, replacement: m('firebase-firestore.js') },
      { find: /^firebase\/storage$/, replacement: m('firebase-storage.js') },
      { find: /^html2canvas$/, replacement: m('html2canvas.js') },
      { find: /^\.{1,2}\/context\/AuthContext$/, replacement: m('AuthContext.jsx') },
    ],
  },
  ssr: { noExternal: ['recharts', 'lucide-react', 'react-router-dom'] },
  build: {
    ssr: true,
    rollupOptions: {
      input: {
        entry: path.resolve(here, 'entry.jsx'),
        calc: path.resolve(here, 'calc.jsx'),
        lastsession: path.resolve(here, 'lastsession.jsx'),
      },
    },
    outDir: path.resolve(here, 'out'),
    emptyOutDir: true,
    minify: false,
  },
});
