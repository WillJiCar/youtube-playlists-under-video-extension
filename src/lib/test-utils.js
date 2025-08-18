export const generateMockPlaylists = (count = 20) => ({
    items: Array.from({length: count}, (_, i) => ({
        id: `mock_playlist_${i}`,
        snippet: {
        title: `Mock Playlist ${i + 1}`,
        description: `Description ${i + 1}`,
        thumbnails: {}
        }
    }))
});

export const mockFetchPlaylists = async () => {
    return generateMockPlaylists(20);
};