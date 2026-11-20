import type { Playlist, PlaylistItem } from '../../src/services/youtube/client/client.types';
import type { PlaylistFixture, PlaylistItemFixture } from './youtube-fixtures.types';

export const thumbnail = (url: string) => ({ url, width: 1, height: 1 });

/** Item de playlist completo, como a API devolve, com só o que o teste quer mudar. */
export function playlistItem({ id, videoId, position = 0, title, thumbnails = {} }: PlaylistItemFixture): PlaylistItem {
    const item: PlaylistItem = {
        kind: 'youtube#playlistItem',
        etag: '',
        id: id ?? `item-${position}`,
        snippet: {
            publishedAt: '',
            channelId: '',
            title: title ?? `Vídeo ${videoId}`,
            description: '',
            thumbnails,
            channelTitle: '',
            videoOwnerChannelTitle: '',
            videoOwnerChannelId: '',
            playlistId: 'PLtest',
            position,
            resourceId: { kind: 'youtube#video', videoId: videoId ?? '' },
        },
    };
    if (videoId !== undefined) item.contentDetails = { videoId, videoPublishedAt: '' };
    return item;
}

export function playlist({ id = 'PLx', title = 'Minha playlist', thumbnails = {} }: PlaylistFixture = {}): Playlist {
    return {
        kind: 'youtube#playlist',
        etag: '',
        id,
        snippet: { publishedAt: '', channelId: '', title, description: '', thumbnails, channelTitle: '' },
    };
}
