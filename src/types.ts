

export interface PlaylistThumbnail {
    height: number
    url: string
    width: number
}

export interface PlaylistSnippet {
    channelId: string
    channelTitle: string
    description: string
    publishedAt: string //2025-08-11T21:23:20.807399Z
    title: string
    thumbnails: {
        default: PlaylistThumbnail
        medium: PlaylistThumbnail
        high: PlaylistThumbnail
        maxres: PlaylistThumbnail
        standard: PlaylistThumbnail
    }
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
    pageInfo: {
        resultsPerPage: number
        totalResults: number
    }
}