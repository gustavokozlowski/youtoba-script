import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'api',
                    environment: 'node',
                    include: ['test/**/*.test.ts'],
                    // Os testes mexem em variáveis de ambiente e no singleton do GoogleAuth.
                    fileParallelism: false,
                },
            },
            {
                plugins: [react()],
                test: {
                    name: 'web',
                    environment: 'jsdom',
                    include: ['web/src/**/*.test.{ts,tsx}'],
                    setupFiles: ['web/src/test/setup.ts'],
                },
            },
        ],
    },
});
