import { CodeChallengeMethod, Credentials, OAuth2Client, OAuth2ClientOptions } from "google-auth-library"
import crypto from "crypto";
import { google } from "googleapis";
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, APP_SECRET } from "./config";

export const isOld = (createdAt: number) => {
    return Date.now() - createdAt > 10 * 60 * 1000
}

export const getAppToken = async (userUid: string) => {
    return await encodeJwt(userUid, 604800) // 1 week JWT which allows client to refresh their google access_token 
}
export const encodeJwt = async (payload: string, expiry = 600) => { // default to 10 minutes
    const { SignJWT } = await import("jose");
    const secret = Buffer.from(APP_SECRET, "base64");
    const now = Math.floor(Date.now() / 1000);
    return await new SignJWT({ p: payload})
        .setProtectedHeader({ alg: "HS256", typ: "JWT"})
        .setIssuedAt(now)
        .setExpirationTime(now + expiry) // 10 minutes
        .sign(secret);
}

export const decodeJwt = async (jwt: string) => {
    const { jwtVerify } = await import("jose");
    const secret = Buffer.from(APP_SECRET, "base64");
    const { payload } = await jwtVerify(jwt, secret);
    return payload.p as string;
}

export function base64url(input) {
  return input.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function randomBytesUrl(n = 32) { return base64url(crypto.randomBytes(n)); }

export const createOAuth2Client = () => {
    const client = new google.auth.OAuth2({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uris: [REDIRECT_URI]
    });
    return client;
}

export const getOAuth2Client = (credentials: Credentials) => {
    const client = createOAuth2Client();
    client.setCredentials(credentials);
    return client;
}

export const getAuthUrl = (state: any, code_challenge: string) => {
    const oauth2Client = createOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/userinfo.profile"],
        response_type: "code",
        state,
        code_challenge,
        prompt: "consent",
        code_challenge_method: CodeChallengeMethod.S256
    });
    return url;
}

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

export const getCallbackHtml = (google_token: string, app_token: string) => {
    return`
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Complete</title>
    <script>
        localStorage.setItem('YTHS_ACCESS_TOKEN', '${google_token}');
        localStorage.setItem('YTHS_APP_TOKEN', '${app_token}');
        if (window.opener) {
            window.opener.postMessage({
                action: "OAUTH_RESULT",
                access_token: '${google_token}',
                app_token: '${app_token}'
            }, "*");
        } else {
            console.log("window.opener not available");
        }
    </script>
    <style>
        body {
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div style="display: flex; align-items: center; flex-direction: column;">
        <img style="max-width: 120px" src="/assets/emoji.jpg"/>
        <div>You are authenticated! please close this window</div>
    </div>
</body>
</html>`
}