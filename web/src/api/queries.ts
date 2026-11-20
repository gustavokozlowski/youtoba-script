import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearOverview, markOverviewStale, readOverview, saveOverview } from '../lib/overview-cache';
import type {
    AuthStatus,
    DuplicatesOverview,
    DuplicatesPreview,
    QuotaSnapshot,
    RemovalJob,
    RemovalJobSummary,
    RemovalStarted,
} from './api.types';
import { api } from './client';

/** Uma chave por dado do servidor: mesma chave, mesmo pedido e mesmo cache em todas as telas. */
export const keys = {
    auth: ['auth'] as const,
    quota: ['quota'] as const,
    overview: ['overview'] as const,
    preview: (playlistId: string) => ['preview', playlistId] as const,
    jobs: ['jobs'] as const,
    job: (jobId: string) => ['job', jobId] as const,
};

const playlistPath = (playlistId: string) => `/playlist/${encodeURIComponent(playlistId)}`;
const POLL_MS = 1_000;
// GET /quota é local (não chama o YouTube), então dá para reler com frequência.
const QUOTA_REFRESH_MS = 15_000;
// A revisão gasta cota; voltar a ela logo depois usa o que já foi lido.
const PREVIEW_FRESH_MS = 30_000;

/**
 * Pedido que gasta cota: a resposta traz o saldo do dia, que vai direto para a barra de topo
 * sem um GET /quota a mais. Se falhar, a barra relê o saldo.
 */
async function spending<T extends { quotaHoje: QuotaSnapshot }>(client: QueryClient, request: Promise<T>) {
    try {
        const response = await request;
        client.setQueryData(keys.quota, response.quotaHoje);
        return response;
    } catch (error) {
        void client.invalidateQueries({ queryKey: keys.quota });
        throw error;
    }
}

export const useAuthStatus = () =>
    useQuery({
        queryKey: keys.auth,
        queryFn: () => api.get<AuthStatus>('/auth/status'),
        staleTime: Number.POSITIVE_INFINITY,
        retry: false,
    });

export const useQuota = () =>
    useQuery({
        queryKey: keys.quota,
        queryFn: () => api.get<QuotaSnapshot>('/quota'),
        refetchInterval: QUOTA_REFRESH_MS,
    });

/**
 * A análise de todas as playlists gasta cota: vale até alguém pedir de novo ou uma remoção mudar
 * os números. Também fica no sessionStorage, para sobreviver a um recarregar da aba.
 */
export function useOverview() {
    const client = useQueryClient();
    return useQuery({
        queryKey: keys.overview,
        queryFn: async () => {
            const overview = await spending(client, api.get<DuplicatesOverview>('/playlist/with-duplicates'));
            saveOverview(overview);
            return overview;
        },
        staleTime: Number.POSITIVE_INFINITY,
        initialData: () => readOverview()?.overview,
        initialDataUpdatedAt: () => {
            const cached = readOverview();
            return cached ? Date.parse(cached.savedAt) : undefined;
        },
        // Depois de uma remoção, analisa de novo ao abrir, com a análise antiga na tela até a nova chegar.
        refetchOnMount: () => (readOverview()?.stale ? 'always' : true),
    });
}

export function usePreview(playlistId: string) {
    const client = useQueryClient();
    return useQuery({
        queryKey: keys.preview(playlistId),
        queryFn: () => spending(client, api.get<DuplicatesPreview>(`${playlistPath(playlistId)}/duplicates`)),
        staleTime: PREVIEW_FRESH_MS,
    });
}

export function useStartRemoval(playlistId: string) {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (confirm: number) =>
            spending(
                client,
                api.send<RemovalStarted>('DELETE', `${playlistPath(playlistId)}/remove-duplicates?confirm=${confirm}`),
            ),
        onSuccess: (started) => {
            markOverviewStale();
            // A tela de progresso abre já com o job, sem esperar a primeira consulta.
            client.setQueryData(keys.job(started.jobId), started);
            void client.invalidateQueries({ queryKey: keys.overview });
            void client.invalidateQueries({ queryKey: keys.preview(playlistId) });
            void client.invalidateQueries({ queryKey: keys.jobs });
        },
    });
}

/** Consulta o job a cada segundo enquanto ele roda; para sozinha quando termina. */
export function useJob(jobId: string) {
    const client = useQueryClient();
    return useQuery({
        queryKey: keys.job(jobId),
        queryFn: () => spending(client, api.get<RemovalJob>(`/jobs/${encodeURIComponent(jobId)}`)),
        refetchInterval: (query) => (query.state.data?.status === 'running' ? POLL_MS : false),
    });
}

export const useJobs = () =>
    useQuery({
        queryKey: keys.jobs,
        queryFn: async () => (await api.get<{ remocoes: RemovalJobSummary[] }>('/jobs')).remocoes,
        refetchInterval: (query) => (query.state.data?.some((job) => job.status === 'running') ? POLL_MS * 2 : false),
    });

/**
 * Sair não limpa o cache em memória: entrar de novo passa pelo Google e recarrega a página,
 * então nada desta sessão chega à próxima. Só a análise guardada na aba é apagada.
 */
export function useSignOut() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => api.send('POST', '/auth/logout'),
        onSettled: () => signedOut(client),
    });
}

export function signedOut(client: QueryClient) {
    clearOverview();
    void client.cancelQueries();
    client.setQueryData<AuthStatus>(keys.auth, { connected: false });
}
