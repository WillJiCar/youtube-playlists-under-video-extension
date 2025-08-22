
import { v4 as uuid } from "uuid";
import { APP_TOKEN_KEY, convertImageToBase64, GOOGLE_ACCESS_TOKEN_KEY, hs } from "./helpers";
import { getChannel, getPlaylists, getTokensFromServer, getUserInfo, isTokenValid, type GetTokensResponse } from "./apis";
import type { PlaylistItem } from "./types";

hs.log("window.location.href", window.location.href);
const backgroundPage = window.browser ? (browser.runtime.getManifest()?.background as any)?.page : "N/A";
const isBackgroundPage = window.location.href == backgroundPage;

export const getUserUid = async () => {
    let userUid = null;
    
    if(window.browser){                       
        const userUidGet = await browser.storage.local.get("userUid");
        userUid = userUidGet.userUid;
        if(!userUid){
            userUid = uuid();
            await browser.storage.local.set({ userUid });
        }
    } else {                        
        userUid = window.localStorage.getItem("userUid");
        if(!userUid){
            userUid = uuid();
            window.localStorage.setItem("userUid", userUid);
            hs.log(`u:${userUid} [new]`);
        } else {
            hs.log(`u:${userUid}`);
        }
    }

    if(!userUid){
        hs.log("no userUid after attempting to create", userUid);
    }

    return userUid;
}

export const getDataFromStorage = async () => {

  let playlists: PlaylistItem[] | null | undefined = null;
  let channelName: string | null | undefined = null;
  let profilePictureBase64: string | null | undefined = null;
  let accountName: string | null | undefined = null;
  let accountId: string | null | undefined = null;

  if(window.browser){
    // get data from browser.storage
    const storeResponse = await browser.storage.local.get([
        "PLAYLISTS",
        "CHANNEL_NAME",
        "ACCOUNT_NAME",
        "PROFILE_PICTURE_BASE64",
        "ACCOUNT_ID"
    ]);
    playlists = storeResponse["PLAYLISTS"];
    channelName = storeResponse["CHANNEL_NAME"];
    accountName = storeResponse["ACCOUNT_NAME"];
    profilePictureBase64 = storeResponse["PROFILE_PICTURE_BASE64"];
    accountId = storeResponse["ACCOUNT_ID"];
  } else {
    // get data from localstorage
    playlists = JSON.parse(window.localStorage.getItem("PLAYLISTS") ?? "['null']");
    channelName = window.localStorage.getItem("CHANNEL_NAME");
    accountName = window.localStorage.getItem("ACCOUNT_NAME");
    profilePictureBase64 = window.localStorage.getItem("PROFILE_PICTURE_BASE64");
    accountId = window.localStorage.getItem("ACCOUNT_ID");
  }

  return {
    playlists, channelName, profilePictureBase64, accountName, accountId
  }
}

export const getData = async (token: string, forceRefresh?: boolean) => {
  
  let update = false;
  let data = !forceRefresh ? await getDataFromStorage() : {} as Awaited<ReturnType<typeof getDataFromStorage>>;
  let { accountId, accountName, channelName, playlists, profilePictureBase64  } = data ?? {};
  let error; // { logged_out: true }

  if(!forceRefresh){
    data = await getDataFromStorage();
  }

  if(!playlists || (playlists.length > 0 && (playlists[0] as any) == "null")){
    const playlistsResponse = await getPlaylists(token);
    playlists = playlistsResponse;
    //hs.log("Got playlists", playlists);            
    update = true;
  }

  if(!channelName){
    const channelResponse = await getChannel(token);
    if(channelResponse.items.length == 0){
        throw new Error("Unable to get channel info, invalid account");
    }
    const channel = channelResponse.items[0]?.snippet;
    channelName = channel?.title;
    //console.log("Got channel name", channelName);

    const profilePictureUrl = channel?.thumbnails?.default?.url;
    profilePictureBase64 = profilePictureUrl ? await convertImageToBase64(profilePictureUrl) : null;
    //console.log("Got profile picture (base64)", profilePictureBase64);
    update = true;
  }

  if(!accountName || !accountId){
    const user = await getUserInfo(token);
    if(!user || user.names.length == 0){
        throw new Error("Unable to fetch channel name, invalid account");
    }
    accountId = user.resourceName;
    accountName = user.names[0]?.displayName;
    //console.log("Got account name & id", accountName, accountId);        
    update = true;
  }
  
  if(update){
      if(window.browser){
          // store data in browser.storage
          await browser.storage.local.set({
              PLAYLISTS: playlists,
              CHANNEL_NAME: channelName,
              ACCOUNT_NAME: accountName,
              PROFILE_PICTURE_BASE64: profilePictureBase64,
              ACCOUNT_ID: accountId
          });
      } else {
          // store data in localstorage
          window.localStorage.setItem("PLAYLISTS", JSON.stringify(playlists));
          window.localStorage.setItem("CHANNEL_NAME", channelName ?? "N/A");
          window.localStorage.setItem("ACCOUNT_NAME", accountName ?? "N/A");
          window.localStorage.setItem("ACCOUNT_ID", accountId);
          if(profilePictureBase64)
              window.localStorage.setItem("PROFILE_PICTURE_BASE64", profilePictureBase64);
      }   
  }

  hs.log("data fetched", update ? "from API" : "from storage", channelName);            

  const _appData = { 
    playlists,
    accountName,
    channelName,
    profilePictureBase64,
    accountId
  }

  return _appData;
}

export const getSelectedPlaylistsFromStorage = async (id: string) => {
  try{
      const key = `SELECTED_PLAYLISTS_${id}`;

      let _selectedPlaylists: string[];
      if(window.browser){
          const storeResponse = await browser.storage.local.get(key);
          _selectedPlaylists = storeResponse[key] ?? [];
      } else {
          _selectedPlaylists = JSON.parse(localStorage.getItem(key) ?? "[]");
      }

      hs.log("fetched", _selectedPlaylists.length, "selected playlists with key", key);
      return _selectedPlaylists;
  } catch(err){
      hs.error(err);
  }
  return [];
}

export const setSelectedPlaylistsInStorage = async (_selectedPlaylists: string[], id: string) => {
  try{
    const key = `SELECTED_PLAYLISTS_${id}`;
    _selectedPlaylists = _selectedPlaylists ?? [];    
    if(window.browser){
        await browser.storage.local.set({ [key]: _selectedPlaylists });
    } else {
        localStorage.setItem(key, JSON.stringify(_selectedPlaylists));
    }

    hs.log("stored selected playlists with key", key);
  } catch(err){
    hs.error(err);
  }
}

export const callGetTokens = async (refresh?: boolean) => {

  let tokens: StoredTokens | null = null;
  try{
    if(!refresh){
      // first check if any tokens in storage, if none then login required
      if(window.browser && !isBackgroundPage){
        hs.log("checking tokens in extension storage");
        tokens = await browser.runtime.sendMessage({ action: "getToken" }) as StoredTokens;
      } else {
        hs.log("checking tokens in browser storage");
        tokens = await getTokensFromStorage();
      }       
    }

    if(tokens){
      hs.log("got tokens from storage");
    } else{
      hs.log("tokens not found in storage");
    }

    const { access_token } = tokens ?? {};
    // then check if stored access_token is valid, if invalid, attempt a refresh
    if(access_token){
      const valid = await isTokenValid(access_token);
      if (!valid) {
        refresh = true;
        hs.log("access_token: invalid");
      } else{
        hs.log("access_token: valid");
      }
    } else {
      hs.log("unable to check if token is valid, access_token missing")
    }

    if(refresh){
      hs.log("access_token - attempting refresh...");
      tokens = await getTokensFromServer();

      if(!tokens || !tokens.access_token){
        hs.log("refresh failure: tokens missing from response, clearing stored tokens");
        await clearTokensFromStorage();
      } else {
        hs.log("access_token: refresed")
      }
    }
  }
  catch(err){
    hs.log("ERROR at callGetToken", err);
  }

  return tokens;
}

export const clearTokensFromStorage = async () => {
  if(window.browser){
    await browser.storage.local.remove([GOOGLE_ACCESS_TOKEN_KEY, APP_TOKEN_KEY]);
  } else {
    window.localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(APP_TOKEN_KEY);
  }
}

export const storeTokensInStorage = async (tokens: GetTokensResponse) => {
  if(window.browser){
    await browser.storage.local.set({ [GOOGLE_ACCESS_TOKEN_KEY]: tokens.access_token, [APP_TOKEN_KEY]: tokens.app_token });
  } 
  else {
    if(tokens.access_token)
      window.localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, tokens.access_token);
    else {
      hs.log("access_token missing");
    }

    if(tokens.app_token){
      window.localStorage.setItem(APP_TOKEN_KEY, tokens.app_token);
    } 
    else {
      hs.log("app_token missing");
    }
  }
}

export interface StoredTokens {
  access_token?: string | null;
  app_token?: string | null
}
export const getTokensFromStorage = async (sendResponse?: (sendResponse?: any) => void): Promise<StoredTokens> => {

  let access_token = null;
  let app_token = null;

  if(window.browser){
    const storedAccessToken = await browser.storage.local.get(GOOGLE_ACCESS_TOKEN_KEY);
    access_token = storedAccessToken[GOOGLE_ACCESS_TOKEN_KEY];

    const storedAppToken = await browser.storage.local.get(APP_TOKEN_KEY);
    app_token = storedAppToken[APP_TOKEN_KEY];
  } else {
    access_token = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
    app_token = localStorage.getItem(APP_TOKEN_KEY);
  }

  if(access_token){
    hs.log("access_token: found (requires validation)");
  } 
  else {
    hs.log("access_token: missing");
  }

  if(app_token){
    hs.log("app_token: found");
  }
  else {
    hs.log("app_token: missing");
  }

  const tokens = { access_token, app_token };
  sendResponse && sendResponse(tokens);
  return tokens;
}