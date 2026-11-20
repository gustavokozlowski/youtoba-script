// Ids codificados por construção, como nos caminhos da API (queries.ts); o router só aceita [A-Za-z0-9_-].
const segment = encodeURIComponent;

export const href = {
    playlists: () => '#/playlists',
    review: (playlistId: string) => `#/p/${segment(playlistId)}`,
    deleted: (playlistId: string) => `#/p/${segment(playlistId)}/apagados`,
    removal: (jobId: string) => `#/remocao/${segment(jobId)}`,
    removals: () => '#/remocoes',
};
