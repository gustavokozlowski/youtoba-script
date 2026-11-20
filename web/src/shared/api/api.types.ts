import type { ApiError } from './client';

// Formato das respostas da API (em português, como o servidor devolve).

export interface ApiErrorBody {
    erro: string;
    mensagem?: string;
    login?: string;
    jobId?: string;
    quotaHoje?: QuotaSnapshot;
}

export interface AuthStatus {
    connected: boolean;
}

export interface QuotaSnapshot {
    dia: string;
    usado: number;
    limite: number;
    restante: number;
    remocoesPossiveis: number;
    zeraEm: string;
    zeraEmBrasilia: string;
}

export interface PlaylistSummary {
    playlistId: string;
    titulo: string;
    capa: string | null;
    link: string;
    privacidade: string | null;
    totalVideos: number;
    aposRemocao: number;
    duplicados: number;
    percentualDuplicado: number;
    indisponiveis: number;
    apagados: number;
    maisRepetidos: { videoId: string; titulo: string; copias: number }[];
    custoRemocao: { unidades: number; cabeHoje: boolean };
}

export interface DuplicatesOverview {
    resumo: {
        playlistsAnalisadas: number;
        ignoradasComMenosDe2Itens: number;
        comDuplicados: number;
        totalDuplicados: number;
        comApagados: number;
        totalApagados: number;
        custoTotalRemocao: number;
        custoDestaAnalise: number;
        aviso?: string;
        falhas: { playlistId: string; titulo: string; motivo: string }[];
    };
    quotaHoje: QuotaSnapshot;
    playlists: PlaylistSummary[];
}

/** Um item da playlist que sai: o vídeo apagado ou, com `primeiraOcorrencia`, uma cópia repetida. */
export interface DeletedItem {
    posicao: number;
    titulo: string;
    canal?: string;
    videoId: string;
    playlistItemId: string;
}

export type DuplicateItem = DeletedItem & { primeiraOcorrencia: number };

/** Custo em cota de uma remoção (mesmo formato nas duas prévias). */
export interface RemovalQuotaEstimate {
    unidadesLeitura: number;
    unidadesRemocao: number;
    total: number;
    limiteDiario: number;
    cabeEmUmDia: boolean;
    maxRemocoesPorDia: number;
    diasNecessarios: number;
}

export interface DuplicatesPreview {
    playlistId: string;
    totalItens: number;
    ficam: number;
    duplicados: number;
    itensDuplicados: DuplicateItem[];
    quota: RemovalQuotaEstimate;
    quotaHoje: QuotaSnapshot;
    cabemHoje: number;
}

/** Resposta de GET /playlist/:id/unavailable. */
export interface UnavailablePreview {
    playlistId: string;
    totalItens: number;
    apagados: number;
    itensApagados: DeletedItem[];
    quota: RemovalQuotaEstimate;
    quotaHoje: QuotaSnapshot;
    cabemHoje: number;
    aviso?: string;
}

export type JobStatus = 'running' | 'done' | 'partial' | 'failed';
export type RemovalKind = 'duplicados' | 'apagados';
export type JobItemState = 'apagado' | 'falhou' | 'pendente';

export interface RemovalJob {
    jobId: string;
    playlistId: string;
    tipo: RemovalKind;
    status: JobStatus;
    situacao: string;
    progresso: string;
    percentual: number;
    removidos: number;
    total: number;
    pendentes: number;
    falhas: { id: string; status?: number; reason?: string }[];
    ultimoItem?: { posicao: number; titulo: string; resultado: 'apagado' | 'falhou' };
    motivoParada?: 'daily_budget' | 'quota_exceeded';
    proximoPasso?: string;
    erro?: string;
    iniciadoEm: string;
    terminadoEm?: string;
    backup: string;
    restaurar: string;
    itens: (DeletedItem & { primeiraOcorrencia?: number; estado: JobItemState })[];
    quotaHoje: QuotaSnapshot;
}

export interface RemovalJobSummary {
    jobId: string;
    playlistId: string;
    tipo: RemovalKind;
    status: JobStatus;
    situacao: string;
    removidos: number;
    total: number;
    iniciadoEm: string;
    terminadoEm?: string;
}

/** Resposta 202 de DELETE /playlist/:id/remove-duplicates e remove-unavailable. */
export type RemovalStarted = RemovalJob & { mensagem: string; cabemHoje: number; acompanhar: string };

// Todo erro de query e mutação é um ApiError: o cliente converte falha de rede e resposta de erro.
declare module '@tanstack/react-query' {
    interface Register {
        defaultError: ApiError;
    }
}
