

// -- Common Google API types

export interface PageInfo {
    totalResults: number;
    resultsPerPage: number;
}

export interface Thumbnails {
    default?: Thumbnail;
    medium?: Thumbnail;
    high?: Thumbnail;
    standard?: Thumbnail;
    maxres?: Thumbnail;
}

export interface Thumbnail {
    url: string;
    width: number;
    height: number;
}

export interface Localized {
    title: string;
    description: string;
}

export interface GoogleError {
    code?: number | null
    message?: string | null
    errors?: any[] | null
}

// -- Get Playlists https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50

export interface PlaylistThumbnail {
    height: number
    url: string
    width: number
}

export interface PlaylistSnippet {
    channelId?: string
    channelTitle?: string
    description?: string
    publishedAt?: string //2025-08-11T21:23:20.807399Z
    title?: string
    thumbnails?: Thumbnails
}

export interface PlaylistItem {
    etag: string
    id: string
    kind: string
    snippet: PlaylistSnippet
    containsCurrentVideo?: boolean // set via our stored selected playlists
}

export interface PlaylistsResponse {
    etag: string
    items: PlaylistItem[]
    kind: string
    pageInfo: PageInfo
    nextPageToken?: string | null
    prevPageToken?: string | null
}

// Get Playlist Items - https://www.googleapis.com/youtube/v3/playlistItems?part=id&playlistId=${playlistId}&videoId=${videoId}

export interface PlaylistItemListResponse {
    kind: string
    etag: string
    items: { kind: string, etag: string, id: string }[]
    pageInfo: { totalResults: number, resultsPerPage: number }
    error?: GoogleError | null
}

// Get User Info -- https://people.googleapis.com/v1/:resourceName?personFields=names

export interface PeopleApiResponse {
    resourceName: string;
    etag: string;
    names: Name[];
}

export interface Name {
    metadata: Metadata;
    displayName: string;
    givenName: string;
    displayNameLastFirst: string;
    unstructuredName: string;
}

export interface Metadata {
    primary: boolean;
    source: Source;
    sourcePrimary: boolean;
}

export interface Source {
    type: string;
    id: string;
}

// Get Channel -- https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true

export interface ChannelResponse {
    kind: string;
    etag: string;
    pageInfo: PageInfo;
    items: ChannelItem[];
}

export interface ChannelItem {
    kind: string;
    etag: string;
    id: string;
    snippet: ChannelSnippet;
}

export interface ChannelSnippet {
    title: string;
    description: string;
    customUrl: string;
    publishedAt: string;
    thumbnails: Thumbnails;
    localized: Localized;
    country: string;
}