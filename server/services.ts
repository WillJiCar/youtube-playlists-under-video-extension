
export async function refreshAccessToken(refreshToken: string, clientId: string, secret: string) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
        client_id: clientId,
        client_secret: secret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
        })
    });
    const data = await res.json();
    return data.access_token;
}