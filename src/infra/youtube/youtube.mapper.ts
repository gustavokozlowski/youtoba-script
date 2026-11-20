import type { youtube_v3 } from '@googleapis/youtube';
import type {
    Playlist,
    PlaylistItem,
    PlaylistSnippet,
    PlaylistStatus,
    YouTubeThumbnail,
    YouTubeThumbnails,
} from './youtube-api.types';

export function mapPlaylist(playlist: youtube_v3.Schema$Playlist): Playlist {
    return {
        kind: playlist.kind ?? '',
        etag: playlist.etag ?? '',
        id: playlist.id ?? '',
        ...(playlist.snippet ? { snippet: mapPlaylistSnippet(playlist.snippet) } : {}),
        ...(playlist.status ? { status: mapPlaylistStatus(playlist.status) } : {}),
        ...(playlist.contentDetails ? { contentDetails: { itemCount: playlist.contentDetails.itemCount ?? 0 } } : {}),
        ...(playlist.player ? { player: { embedHtml: playlist.player.embedHtml ?? '' } } : {}),
    };
}

export function mapPlaylistItem(item: youtube_v3.Schema$PlaylistItem): PlaylistItem {
    return {
        kind: item.kind ?? '',
        etag: item.etag ?? '',
        id: item.id ?? '',
        ...(item.snippet
            ? {
                  snippet: {
                      publishedAt: item.snippet.publishedAt ?? '',
                      channelId: item.snippet.channelId ?? '',
                      title: item.snippet.title ?? '',
                      description: item.snippet.description ?? '',
                      thumbnails: mapThumbnails(item.snippet.thumbnails),
                      channelTitle: item.snippet.channelTitle ?? '',
                      videoOwnerChannelTitle: item.snippet.videoOwnerChannelTitle ?? '',
                      videoOwnerChannelId: item.snippet.videoOwnerChannelId ?? '',
                      playlistId: item.snippet.playlistId ?? '',
                      position: item.snippet.position ?? 0,
                      resourceId: {
                          kind: item.snippet.resourceId?.kind ?? '',
                          videoId: item.snippet.resourceId?.videoId ?? '',
                      },
                  },
              }
            : {}),
        ...(item.contentDetails
            ? {
                  contentDetails: {
                      videoId: item.contentDetails.videoId ?? '',
                      startAt: item.contentDetails.startAt ?? undefined,
                      videoPublishedAt: item.contentDetails.videoPublishedAt ?? '',
                  },
              }
            : {}),
        ...(item.status ? { status: { privacyStatus: normalizePrivacyStatus(item.status.privacyStatus) } } : {}),
    };
}

function mapPlaylistSnippet(snippet: youtube_v3.Schema$PlaylistSnippet): PlaylistSnippet {
    return {
        publishedAt: snippet.publishedAt ?? '',
        channelId: snippet.channelId ?? '',
        title: snippet.title ?? '',
        description: snippet.description ?? '',
        thumbnails: mapThumbnails(snippet.thumbnails),
        channelTitle: snippet.channelTitle ?? '',
        tags: snippet.tags ?? undefined,
        defaultLanguage: snippet.defaultLanguage ?? undefined,
        localized: snippet.localized
            ? { title: snippet.localized.title ?? '', description: snippet.localized.description ?? '' }
            : undefined,
    };
}

function mapPlaylistStatus(status: youtube_v3.Schema$PlaylistStatus): PlaylistStatus {
    return { privacyStatus: normalizePrivacyStatus(status.privacyStatus) };
}

function mapThumbnails(thumbnails: youtube_v3.Schema$ThumbnailDetails | null | undefined): YouTubeThumbnails {
    return {
        ...(thumbnails?.default ? { default: mapThumbnail(thumbnails.default) } : {}),
        ...(thumbnails?.medium ? { medium: mapThumbnail(thumbnails.medium) } : {}),
        ...(thumbnails?.high ? { high: mapThumbnail(thumbnails.high) } : {}),
        ...(thumbnails?.standard ? { standard: mapThumbnail(thumbnails.standard) } : {}),
        ...(thumbnails?.maxres ? { maxres: mapThumbnail(thumbnails.maxres) } : {}),
    };
}

function mapThumbnail(thumbnail: youtube_v3.Schema$Thumbnail): YouTubeThumbnail {
    return {
        url: thumbnail.url ?? '',
        width: thumbnail.width ?? 0,
        height: thumbnail.height ?? 0,
    };
}

function normalizePrivacyStatus(status: string | null | undefined): PlaylistStatus['privacyStatus'] {
    if (status === 'public' || status === 'unlisted') return status;
    return 'private';
}
