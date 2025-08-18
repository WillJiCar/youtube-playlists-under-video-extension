import { loginWithGoogle } from "./lib/oauth.js";

let accessToken = null; // in-memory cache
let clientId = null; // fetched on load

async function getClientId() {
  try {
    const response = await fetch('/src/config.json');
    const config = await response.json();
    return config.clientId;
  } catch (error) {
    console.log("Failed to load config:", error);
    return "fallback_client_id"; // For development
  }
}

// Usage
getClientId().then(_clientId => {
  console.log("Loaded Client ID:", _clientId);
  clientId = _clientId;
});

browser.runtime.onMessage.addListener(async (msg, sender) => {
    console.log("received message: ", msg);
    if (msg.action === "login") {
        const token = await loginWithGoogle(clientId);
        accessToken = token;
        return token;
    }

    if (msg.action === "getToken") {
        if (!accessToken) {
            const token = await browser.storage.local.get("accessToken");
            console.log("found stored token", token);
            accessToken = token;            
        } else {
            console.log("found cache token", accessToken);
        }

        if (accessToken) {
            const valid = await isTokenValid(accessToken);
            if (!valid) {
                console.log("Stored token is invalid or expired, clearing...");
                const token = await loginWithGoogle(clientId);
                accessToken = token;
            }
        }

        return accessToken;
    } 

});

async function isTokenValid(token) {
  try {
    const resp = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    if (!resp.ok) return false;
    const data = await resp.json();
    return !data.error; // true if no error
  } catch (err) {
    console.error("Token validation failed", err);
    return false;
  }
}