export type Route =
    | { name: 'playlists' }
    | { name: 'review'; playlistId: string }
    | { name: 'deleted'; playlistId: string }
    | { name: 'removal'; jobId: string }
    | { name: 'removals' };
