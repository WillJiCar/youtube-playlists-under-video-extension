

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
}

export interface PlaylistsResponse {
    etag: string
    items: PlaylistItem[]
    kind: string
    pageInfo: PageInfo
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