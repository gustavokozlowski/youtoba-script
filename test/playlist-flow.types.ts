import type { formatEntry, formatOverview, formatPreview } from '../src/modules/playlist/playlist.formatter';
import type { formatJob } from '../src/modules/removal/removal.formatter';

// As respostas da API vêm dos formatadores; os testes leem o corpo com o mesmo tipo.
export type PreviewBody = ReturnType<typeof formatPreview>;
export type EntryBody = ReturnType<typeof formatEntry>;
export type JobBody = ReturnType<typeof formatJob>;
export type OverviewBody = ReturnType<typeof formatOverview>;

/** O pedido que o nock não reconheceu (evento 'no match'). */
export interface UnmatchedRequest {
    method?: string;
    hostname?: string;
    host?: string;
    href?: string;
    path?: string;
}

/** Item da playlist como o YouTube o devolve, com só o que os testes de fluxo controlam. */
export interface ApiItemFixture {
    id: string;
    videoId: string;
    position: number;
    title?: string;
    /** Vídeo apagado ou privado vem sem data de publicação. */
    videoPublishedAt?: string;
}

/** Corpo do dry-run de vídeos apagados (`GET /playlist/:id/unavailable`). */
export interface UnavailableBody {
    playlistId: string;
    totalItens: number;
    apagados: number;
    itensApagados: { posicao: number; titulo: string; canal?: string; videoId: string; playlistItemId: string }[];
    quota: { unidadesLeitura: number; unidadesRemocao: number; cabeEmUmDia: boolean };
    quotaHoje: { usado: number; restante: number; limite: number };
    cabemHoje: number;
    aviso: string;
}
