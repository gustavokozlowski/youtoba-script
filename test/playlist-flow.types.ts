import type { formatEntry, formatJob, formatOverview, formatPreview } from '../src/modules/playlist/playlist.formatter';

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
