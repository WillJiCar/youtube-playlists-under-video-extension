import { OAuth2Client } from "google-auth-library"
import crypto from "crypto";

export const generateUserToken = (userId: string, secret: string) => {
    return crypto.createHmac("sha256", secret).update(userId).digest("hex");
}

export const getAuthUrl = (oauth2Client: OAuth2Client, state: any) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/youtube", "https://www.googleapis.com/auth/userinfo.profile"],
        response_type: "code",
        state: state
    });
    console.log("sending redirect URL:", url);
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

export const getCallbackHtml = (token: string) => {
    return`
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Complete</title>
    <script>
        localStorage.setItem('YTHS_ACCESS_TOKEN', '${token}');
        console.log(localStorage.getItem('YTHS_ACCESS_TOKEN'));
    </script>
    <style>
        body {
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div style="display: flex; align-items: center; flex-direction: column;">
        <img style="max-width: 100%" src="/assets/emoji.jpg"/>
        <div>You are now authenticated, please close this window</div>
    </div>
</body>
</html>`
}