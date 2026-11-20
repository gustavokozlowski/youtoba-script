import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/**
 * Várias leituras gastam cota do YouTube: nada de reler só porque a janela voltou ao foco, e nova
 * tentativa só quando o servidor local nem respondeu (erro de rede), nunca depois de uma resposta.
 */
export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: (failures, error) => error instanceof ApiError && error.code === 'offline' && failures < 2,
            },
            mutations: { retry: false },
        },
    });
}
