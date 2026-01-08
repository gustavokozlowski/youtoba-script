
import type { FormattedPlaylistItem } from '../services/youtube/types';

export function validateDuplicateItems(list: FormattedPlaylistItem[]): { uniqueItems: FormattedPlaylistItem[]; duplicateItems: FormattedPlaylistItem[] } {
    const uniqueItems: FormattedPlaylistItem[] = [];
    const duplicateItems: FormattedPlaylistItem[] = [];

    list.forEach((item) => {
        const { videoId, title, videoOwnerChannelTitle } = item;
        if (!uniqueItems.some((i) => i.videoId === videoId || i.title === title && i.videoOwnerChannelTitle === videoOwnerChannelTitle)) {
            uniqueItems.push(item);
        } else {
            duplicateItems.push(item);
        }
    });

    return { uniqueItems, duplicateItems };
}