import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        // Os testes mexem em variáveis de ambiente e no singleton do GoogleAuth.
        fileParallelism: false,
    },
});
