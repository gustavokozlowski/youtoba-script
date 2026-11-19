import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em dev a interface roda em :5173 e repassa a API para o servidor em :3000.
// changeOrigin fica desligado de propósito: o Host continua localhost:5173, igual ao Origin,
// e o localOnly do servidor aceita o pedido como mesma origem.
const API = 'http://localhost:3000';
const apiPaths = ['/auth', '/playlist', '/jobs', '/quota', '/dev'];

export default defineConfig({
    root: __dirname,
    plugins: [react()],
    build: { outDir: 'dist', emptyOutDir: true },
    server: {
        port: 5173,
        strictPort: true,
        proxy: Object.fromEntries(apiPaths.map((path) => [path, { target: API, changeOrigin: false }])),
    },
});
