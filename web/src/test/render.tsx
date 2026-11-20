import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createQueryClient } from '../api/query-client';

/** Um cliente novo por teste, sem nova tentativa e sem timers de limpeza soltos. */
export function testQueryClient() {
    const client = createQueryClient();
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false, gcTime: Infinity } });
    return client;
}

/** Renderiza dentro do QueryClientProvider. Passe o mesmo `client` para simular a volta a uma tela. */
export function render(ui: ReactElement, client: QueryClient = testQueryClient()) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { ...rtlRender(ui, { wrapper }), client };
}
