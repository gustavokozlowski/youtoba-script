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
    maisRepetidos: { videoId: string; titulo: string; copias: number }[];
    custoRemocao: { unidades: number; cabeHoje: boolean };
}

export interface DuplicatesOverview {
    resumo: {
        playlistsAnalisadas: number;
        ignoradasComMenosDe2Itens: number;
        comDuplicados: number;
        totalDuplicados: number;
        custoTotalRemocao: number;
        custoDestaAnalise: number;
        aviso?: string;
        falhas: { playlistId: string; titulo: string; motivo: string }[];
    };
    quotaHoje: QuotaSnapshot;
    playlists: PlaylistSummary[];
}

export interface DuplicateItem {
    posicao: number;
    titulo: string;
    canal?: string;
    videoId: string;
    playlistItemId: string;
    primeiraOcorrencia: number;
}

export interface DuplicatesPreview {
    playlistId: string;
    totalItens: number;
    ficam: number;
    duplicados: number;
    itensDuplicados: DuplicateItem[];
    quota: {
        unidadesLeitura: number;
        unidadesRemocao: number;
        total: number;
        limiteDiario: number;
        cabeEmUmDia: boolean;
        maxRemocoesPorDia: number;
        diasNecessarios: number;
    };
    quotaHoje: QuotaSnapshot;
    cabemHoje: number;
}

export type JobStatus = 'running' | 'done' | 'partial' | 'failed';
export type JobItemState = 'apagado' | 'falhou' | 'pendente';

export interface RemovalJob {
    jobId: string;
    playlistId: string;
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
    itens: (DuplicateItem & { estado: JobItemState })[];
    quotaHoje: QuotaSnapshot;
}

export interface RemovalJobSummary {
    jobId: string;
    playlistId: string;
    status: JobStatus;
    situacao: string;
    removidos: number;
    total: number;
    iniciadoEm: string;
    terminadoEm?: string;
}

/** Resposta 202 de DELETE /playlist/:id/remove-duplicates. */
export type RemovalStarted = RemovalJob & { mensagem: string; cabemHoje: number; acompanhar: string };

// Todo erro de query e mutação é um ApiError: o cliente converte falha de rede e resposta de erro.
declare module '@tanstack/react-query' {
    interface Register {
        defaultError: ApiError;
    }
}
