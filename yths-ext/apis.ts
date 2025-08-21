
// console - https://console.cloud.google.com/apis/api/youtube.googleapis.com/metrics?authuser=1&inv=1&invt=Ab5vyA&project=youtube-playlists-under-video

import { getTokensFromStorage, getUserUid, storeTokensInStorage, type StoredTokens } from "./browser";
import { APP_TOKEN_KEY, GOOGLE_ACCESS_TOKEN_KEY, hs } from "./helpers";
import type { PeopleApiResponse, PlaylistsResponse, ChannelResponse } from "./types";

const scopes = "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/userinfo.profile";

interface ExtensionConfig {
  clientId?: string
  environment?: "local"
  proxyPort?: number
  proxyDomain?: string
}

export async function getConfig() {
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    return config as ExtensionConfig;
  } catch (error) {
    console.log("Failed to load config:", error);
    return null;
  }
}

export async function isTokenValid(token: string) {
  try {
    const resp = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    if (!resp.ok) return false;
    const data = await resp.json();
    return !data.error; // true if no error
  } catch (err) {
    console.log("Token validation failed", err);
    return false;
  }
}

// -- HSYT API'S

export interface GetTokensResponse {
  access_token?: string | null
  expiry_date?: string | null
  app_token?: string | null
}
export const getTokensFromServer = async (sendResponse?: (sendResponse?: any) => void) => {

  let tokens: GetTokensResponse | null = null;

  try {

    const storedTokens = await getTokensFromStorage();
    const { app_token } = storedTokens;
    if(!app_token){
      return null;
    }
    
    const config = await getConfig();
    const port = config?.proxyPort ?? 3000;
    const domain = config?.proxyDomain ?? "localhost";    
    const proxyUrl = `https://${domain}:${port}/auth/token`;

    hs.log("fetching auth_url on", proxyUrl);
    const proxyResponse = await fetch(proxyUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${app_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!proxyResponse.ok) {
      hs.log("Failed to fetch tokens:", proxyResponse.status, proxyResponse.statusText);
      return null;
    }

    tokens = await proxyResponse.json();

    // Optionally store the tokens
    if (tokens?.access_token || tokens?.app_token) {
      await storeTokensInStorage(tokens);
    }    
  } catch (err) {
    hs.log("Error fetching tokens:", err);
    return null;
  }

  sendResponse && sendResponse(tokens);
  return tokens;
}

export const login = async (sendResponse?: (sendResponse?: any) => void) => {
  const useServerAuth = true;
  let tokens: StoredTokens | null = null;
  const config = await getConfig();

  if(useServerAuth){
    // authenticate using proxy server so we can fetch refresh_tokens securely with client secret

    const userUid = await getUserUid();
    if(!userUid){
      throw new Error("No userUid to do login with")
    }
    const port = config?.proxyPort ?? 3000;
    const domain = config?.proxyDomain ?? "localhost";    
    const proxyUrl = `https://${domain}:${port}/auth/login?userUid=${userUid}`;

    hs.log("fetching auth_url on", proxyUrl);
    const proxyResponse = await fetch(proxyUrl);

    const { url } = await proxyResponse.json();

    // Open in new tab and listen for response
    hs.log("auth_url", url);
    if(window.browser){
      const tab = await browser.tabs.create({ url: url });

      tokens = await new Promise<any>((resolve) => {
        browser.tabs.onRemoved.addListener((tabId) =>{
          if(tabId == tab.id){
            hs.log("tab closed by user");
            resolve(null);
          }
        });
        browser.runtime.onMessage.addListener(function listener(message) {
          hs.log("got message", message);
          if (message.type == 'OAUTH_RESULT') {
            hs.log("auth success");
            browser.tabs.remove(tab.id!);
            resolve(message); 
          }
        });
      });
    } else {
      const popup = window.open(url, "_blank");

      tokens = await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (popup?.closed) {
            clearInterval(interval);
            hs.log("popup closed by user");
            resolve(null);
          }
        }, 500); // check if popup has been closed

        window.addEventListener("message", (ev) => {
          const message = ev.data;
          if(ev.source == popup && message.type == "OAUTH_RESULT"){            
            hs.log("auth received");
            popup?.close();
            resolve(message);
          }
        })
      })
    }
  } else {
    // otherwise use launchWebAuthFlow

    const clientId = config?.clientId;

    if(!clientId){
      throw new Error("Unable to fetch clientId");
    }

    const redirect_uri = `${browser.identity.getRedirectURL()}google-auth`
    console.log("redirect_uri", redirect_uri)

    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&prompt=consent`;

    console.log("Starting Google OAuth");
    const redirectResponse = await browser.identity.launchWebAuthFlow({
      interactive: true,
      url: authUrl
    });

    const params = new URL(redirectResponse).hash.substring(1);
    const accessToken = new URLSearchParams(params).get("access_token");
    console.log("access_token", accessToken);

    if (!accessToken) throw new Error("Login failed: no token returned");
  }

  if(tokens){
    hs.log("tokens fetched");
    await storeTokensInStorage(tokens);
  } else {
    hs.log("login success, tokens missing");
  }

  
  sendResponse && sendResponse(tokens);
  return tokens;
}

// -- GOOGLE API'S
export const getPlaylists = async (token: string): Promise<PlaylistsResponse> => {
  return await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50", { 
    headers: { Authorization: `Bearer ${token}` } 
  }).then(res => res.json());
}

export const getUserInfo = async (token: string): Promise<PeopleApiResponse> => {
  return await fetch("https://people.googleapis.com/v1/people/me?personFields=names", {
    headers: { Authorization: `Bearer ${token}` } 
  }).then(res => res.json());
}

export const getChannel = async (token: string): Promise<ChannelResponse> => {
  return await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${token}` } 
  }).then(res => res.json());
}