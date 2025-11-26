export type YoutubeClientConfig = {
    apiKey: string;
    token: string;
};

// ============================================
// YouTube Data API v3 - TypeScript Definitions
// ============================================

// Common Types
// ============================================

export interface YouTubeThumbnail {
    url: string;
    width: number;
    height: number;
}

export interface YouTubeThumbnails {
    default?: YouTubeThumbnail;
    medium?: YouTubeThumbnail;
    high?: YouTubeThumbnail;
    standard?: YouTubeThumbnail;
    maxres?: YouTubeThumbnail;
}

export interface PageInfo {
    totalResults: number;
    resultsPerPage: number;
}

// Playlist Types
// ============================================

export interface PlaylistSnippet {
    publishedAt: string; // datetime ISO 8601
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    tags?: string[];
    defaultLanguage?: string;
    localized?: {
        title: string;
        description: string;
    };
}

export interface PlaylistContentDetails {
    itemCount: number;
}

export interface PlaylistStatus {
    privacyStatus: 'public' | 'private' | 'unlisted';
}

export interface PlaylistPlayer {
    embedHtml: string;
}

export interface PlaylistLocalization {
    title: string;
    description: string;
}

export interface Playlist {
    kind: string;
    etag: string;
    id: string;
    snippet?: PlaylistSnippet;
    status?: PlaylistStatus;
    contentDetails?: PlaylistContentDetails;
    player?: PlaylistPlayer;
    localizations?: Record<string, PlaylistLocalization>;
}

export interface PlaylistsResponse {
    kind: string;
    etag: string;
    nextPageToken?: string;
    prevPageToken?: string;
    pageInfo: PageInfo;
    items: Playlist[];
}

// PlaylistItem Types
// ============================================

export interface PlaylistItemResourceId {
    kind: string; // e.g., "youtube#video"
    videoId: string;
}

export interface PlaylistItemSnippet {
    publishedAt: string; // datetime ISO 8601
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    videoOwnerChannelTitle: string;
    videoOwnerChannelId: string;
    playlistId: string;
    position: number;
    resourceId: PlaylistItemResourceId;
}

export interface PlaylistItemContentDetails {
    videoId: string;
    startAt?: string; // deprecated
    endAt?: string; // deprecated
    note?: string; // max 280 characters
    videoPublishedAt: string; // datetime ISO 8601
}

export interface PlaylistItemStatus {
    privacyStatus: 'public' | 'private' | 'unlisted';
}

export interface PlaylistItem {
    kind: string;
    etag: string;
    id: string; // Playlist Item ID (importante para deletar!)
    snippet?: PlaylistItemSnippet;
    contentDetails?: PlaylistItemContentDetails;
    status?: PlaylistItemStatus;
}

export interface PlaylistDetailsResponse {
    kind: string;
    etag: string;
    nextPageToken?: string;
    prevPageToken?: string;
    pageInfo: PageInfo;
    items: PlaylistItem[];
}

// API Error Types
// ============================================

export interface YouTubeErrorDetail {
    message: string;
    domain: string;
    reason: string;
}

export interface YouTubeError {
    code: number;
    message: string;
    errors: YouTubeErrorDetail[];
}

export interface YouTubeErrorResponse {
    error: YouTubeError;
}

// API Request Parameter Types
// ============================================

export interface PlaylistsListParams {
    part: string | string[]; // e.g., "snippet,contentDetails,status"
    id?: string | string[]; // Playlist IDs
    channelId?: string;
    mine?: boolean;
    maxResults?: number; // 0-50, default 5
    pageToken?: string;
}

export interface PlaylistItemsListParams {
    part: string | string[]; // e.g., "snippet,contentDetails,status"
    playlistId: string;
    id?: string | string[]; // Playlist Item IDs
    maxResults?: number; // 0-50, default 5
    pageToken?: string;
    videoId?: string;
}

export interface PlaylistItemsDeleteParams {
    id: string; // Playlist Item ID (não o Video ID!)
}

export interface PlaylistItemsInsertParams {
    part: string | string[]; // e.g., "snippet"
    resource: {
        snippet: {
            playlistId: string;
            resourceId: {
                kind: 'youtube#video';
                videoId: string;
            };
            position?: number; // opcional, posição na playlist
        };
    };
}

export interface PlaylistItemsUpdateParams {
    part: string | string[];
    resource: {
        id: string; // Playlist Item ID
        snippet?: {
            playlistId: string;
            resourceId: {
                kind: 'youtube#video';
                videoId: string;
            };
            position?: number;
        };
    };
}
