import type { PlaylistItem } from './client/client.types';

export interface FormattedPlaylistItem {
    playlistItemId: PlaylistItem['id'];
    title: PlaylistItem['snippet']['title'];
    videoId: PlaylistItem['contentDetails']['videoId'];
    videoOwnerChannelTitle: PlaylistItem['snippet']['videoOwnerChannelTitle'];
}
