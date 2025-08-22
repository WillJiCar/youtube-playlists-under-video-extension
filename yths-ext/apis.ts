
// console - https://console.cloud.google.com/apis/api/youtube.googleapis.com/metrics?authuser=1&inv=1&invt=Ab5vyA&project=youtube-playlists-under-video

import { callGetTokens, getTokensFromStorage, getUserUid, storeTokensInStorage, type StoredTokens } from "./browser";
import { hs } from "./helpers";
import type { PeopleApiResponse, PlaylistsResponse, ChannelResponse, PlaylistItem, PlaylistItemListResponse, PlaylistItemResponse } from "./types";

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

// -- HSYT Playlist Items cache

const usePlaylistCache = true; // cache was used to store latest playlistItemId API fetch response, however to mitigate the change of a playlist being modified externally and cache being incorrect this has been disabled and instead a debounce on the storage onChanged event has been applied
const playlistCache = new Map<string, string | null | undefined>();

setInterval(() => {
  const size = playlistCache.size;
  if(size > 0){
    playlistCache.clear();
    hs.log("playlist cache cleared of", size, "entries");
  }
}, 5 * 60 * 1000) // 5 minute cache

function makeKey(videoId: string, playlistId: string) {
  return `${videoId}:${playlistId}`;
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
      hs.log("unable to fetch a new access_token as app_token is missing from storage");
      return null;
    }
    
    const config = await getConfig();
    const port = config?.proxyPort ?? 3000;
    const domain = config?.proxyDomain ?? "localhost";    
    const proxyUrl = `https://${domain}:${port}/auth/token`;

    hs.log("refreshing access_token on", proxyUrl);
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

    if (tokens?.access_token || tokens?.app_token) {
      await storeTokensInStorage(tokens);
      hs.log("access_token refresh success");
    }    
  } catch (err) {
    hs.log("Error fetching tokens:", err);
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
            hs.log("tab closed");
            resolve(null);
          }
        });
        browser.runtime.onMessage.addListener(function listener(message) {
          hs.log("got message", message);
          if (message.action == 'OAUTH_RESULT') {
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
          if(ev.source == popup && message.action == "OAUTH_RESULT"){            
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
    hs.log("login flow finished but tokens missing");
  }

  
  sendResponse && sendResponse(tokens);
  return tokens;
}

// -- GOOGLE API'S
export const getPlaylists = async (token: string, pageToken?: string | null) => {
  const MAX = 50;
  const TOTAL_MAX = 500;
  let playlists: PlaylistItem[] = [];
  let attempt = 1;
  let blocked = false;
  while(!blocked){
    try{      
      const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=${MAX}${pageToken ? `&pageToken=${pageToken}` : ""}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).then(res => res.json()) as PlaylistsResponse;

      if((playlistResponse as any).error){
        blocked = true;
      }      
      playlists.push(...playlistResponse.items);
      pageToken = playlistResponse.nextPageToken;
      if(playlists.length >= TOTAL_MAX || !playlistResponse.nextPageToken){
        blocked = true;
        console.log("Finished fetching", playlists.length, "in", attempt, "attempts");
      }
      attempt++;
    }
    catch(err){
      console.log("Error calling api", err);
      blocked = true;
    }
  }

  return playlists;
}

export const getUserInfo = async (token: string) => {
  try{
    const res = await fetch("https://people.googleapis.com/v1/people/me?personFields=names", {
      headers: { Authorization: `Bearer ${token}` } 
    })    
    if(res.status == 401){
      // access_token requires refresh
      // then return await getUserInfo(newToken);
    }
    const json = await res.json() as PeopleApiResponse;
    return json;
  }catch(err){
    hs.error(err);
    return null;
  }
  
}

export const getChannel = async (token: string): Promise<ChannelResponse> => {
  return await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${token}` } 
  }).then(res => res.json());
}

export const checkPlaylistsForVideoId = async (videoId: string, playlists: PlaylistItem[]) => {
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];

    if(!playlist){
      hs.log("playlist at index", i, "empty, skipping video check");
      continue;
    }

    const key = makeKey(videoId, playlist.id);

    let playlistItemId: string | null | undefined;
    if (playlistCache.has(key) && usePlaylistCache) {
      playlistItemId = playlistCache.get(key)!;
      hs.log("playlistItemId check performed via cache");
    } else {
      playlistItemId = await getPlaylistItemId(videoId, playlist.id);
      playlistCache.set(key, playlistItemId);
      hs.log("playlistItemId check performed via API and stored in cache", key, playlistItemId);
    }

    playlist.playlistItemId = playlistItemId;
  }

  return playlists;
}

export const getPlaylistItemId = async (videoId: string, playlistId: string) => {
  try{
    const tokens = await callGetTokens()
    if(!tokens){
      hs.log("failed to check if video in playlist, client is probably logged out");
      return null;
    }
    hs.log("checking if video", videoId, "is in playlist", playlistId);
    const _res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=id&playlistId=${playlistId}&videoId=${videoId}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` } 
    });
    const res = await _res.json() as PlaylistItemListResponse;
    if(!_res.ok && !res.error){
      hs.log("failed to check if video in playlist, request failed", _res.status, _res.statusText);
      return null;
    }

    if(res.error){
      hs.log("failed to check if video in playlist,", res.error.message ?? "youtube API error")
      return null;
    }

    hs.log("video", videoId, "in playlist", playlistId, res.items.length > 0)
    return res.items.length > 0 ? res.items[0]?.id : null;
  } 
  catch(err){
    hs.error(err);
    return null;
  }
}

export const addVideoToPlaylist = async (playlistId?: string, videoId?: string) => {
  try{
    if(!playlistId || !videoId){
      hs.log("unable to add video", videoId, "to playlist", playlistId, "as one of the arguments is missing");
      return null;
    }
    const tokens = await callGetTokens()
    if(!tokens){
      hs.log("failed to add video to playlist, client is probably logged out");
      return null;
    }
    hs.log("adding video", videoId, "to playlist", playlistId);
    const _res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      body: JSON.stringify({
        snippet: {
          playlistId: playlistId,
          resourceId: { 
              kind: "youtube#video",
              videoId: videoId
          }
        }
      }),
      method: "POST" 
    });
    const res = await _res.json() as PlaylistItemResponse;
    if(!_res.ok && !res.error){
      hs.log("failed to add video to playlist, request failed", _res.status, _res.statusText);
      return null;
    }

    if(res.error){
      hs.log("failed to add video to playlist,", res.error.message ?? "youtube API error")
      return null;
    }

    hs.log("video added to playlist, playlistItemId:", res.id);
    if(res.id){
      const key = makeKey(videoId, playlistId);
      playlistCache.set(key, res.id);
    }
    return res.id;
  } 
  catch(err){
    hs.error(err);
    return null;
  }
}

export const removeVideoFromPlaylist = async (playlistItemId?: string) => {
  try{
    if(!playlistItemId){
      hs.log("unable to remove video from playlist using playlistItemId as it's missing");
      return false;
    }
    const tokens = await callGetTokens()
    if(!tokens){
      hs.log("failed to remove video from playlist, client is probably logged out");
      return false;
    }
    hs.log("removing video from playlist with playlistItemId", playlistItemId);
    const _res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${playlistItemId}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      method: "DELETE" 
    });
    if(_res.ok){
      hs.log("video removed from playlist");
      for (const [key, id] of playlistCache.entries()) {
        if (id === playlistItemId) {
          playlistCache.set(key, null);
          break;
        }
      }
      return true;
    } else {
      hs.log("error encountered while removing video from playlist", _res.status, _res.statusText);
      return false;
    }
  } 
  catch(err){
    hs.error(err);
    return false;
  }
}



/*
(window as any).testToken = "ya29.A0AS3H6NxoBotb67vt3VozynE73OG0DwM8TneTmDucrB9IrRhP2ynuFCuVHNhyv_wYy5gVipfsZ-3aAmaMPregHkJGTmEjHZHv_KODd9FuqtnbBavI7293rpEDl20zBZEVEItbTTQTPGDW50OjrVe7E0sI_Stu7j7NKFQt8EBJlY0O1mxATEDWCiv7s9duuEibsQVhWfsaCgYKAVQSARMSFQHGX2Mi5Ga1i0DJyT5vMgjxKjJr3g0206";

(async () => {
  let call = 1;
  let blocked = false;
  let nextPageToken;
  while(!blocked){
    try{
      
      const playlists = await getPlaylists((window as any).testToken, nextPageToken);
      if((playlists as any).error){
        blocked = true;
      }
      nextPageToken = playlists.nextPageToken;
      console.log("called api", call, playlists);
      call++;
      await wait(10);
    }
    catch(err){
      console.log("Error calling api", err);
      blocked = true;
    }
  }
})
*/