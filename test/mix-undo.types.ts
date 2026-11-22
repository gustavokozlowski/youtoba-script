/** Corpo de `GET /jobs/:id` para um desfazer (`formatJob` com `tipo: 'desfazer_mix'`). */
export interface UndoJobBody {
    jobId: string;
    tipo: 'desfazer_mix';
    status: 'running' | 'done' | 'partial' | 'failed';
    playlistId: string;
    removidos: number;
    total: number;
}

/** Corpo do 409 `confirmation_required` do desfazer. */
export interface UndoPreviewBody {
    erro: string;
    destino: unknown;
    itens: { videoId: string; playlistItemId: string }[];
    quotaHoje: { usado: number; restante: number; limite: number };
}
