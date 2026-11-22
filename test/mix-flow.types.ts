/** Entrada como a API a devolve (formatEntry): só os campos que os testes do Mix conferem. */
export interface MixEntryBody {
    posicao: number;
    videoId: string;
    titulo: string;
    primeiraOcorrencia?: number;
    motivo?: string;
}

/** Corpo do dry-run `GET /playlist/:destino/mix`. */
export interface MixPreviewBody {
    origem: { playlistId: string; totalItens: number };
    destino: { playlistId: string; totalItens: number };
    entram: MixEntryBody[];
    pulados: {
        jaNoDestino: MixEntryBody[];
        repetidosNaOrigem: MixEntryBody[];
        indisponiveis: MixEntryBody[];
    };
    quota: Record<string, unknown>;
    quotaHoje: { usado: number; restante: number; limite: number };
    cabemHoje: number;
    paraAdicionar: string;
}

/** Corpo de `GET /jobs/:id` para um Mix. */
export interface MixJobBody {
    jobId: string;
    tipo: 'mix';
    status: 'running' | 'done' | 'partial' | 'failed';
    origem: string;
    destino: string;
    progresso: string;
    adicionados: number;
    total: number;
    falhas: { id: string; status?: number; reason?: string }[];
    pendentes: number;
    motivoParada?: string;
    registro: string;
    itens: { videoId: string; estado: 'adicionado' | 'falhou' | 'pendente' }[];
}

/** Arquivo de registro do Mix em BACKUP_DIR. */
export interface MixRecordFile {
    version: number;
    kind: 'mix';
    sourceId: string;
    targetId: string;
    planned: unknown[];
    added: { videoId: string; playlistItemId: string }[];
    failed: { id: string; status?: number; reason?: string }[];
    finishedAt?: string;
}

/** Corpo de um insert recebido pelo mock do YouTube. */
export interface InsertBody {
    snippet?: { playlistId?: string; position?: number; resourceId?: { videoId?: string } };
}
