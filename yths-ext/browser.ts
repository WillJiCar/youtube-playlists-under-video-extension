
import { v4 as uuid } from "uuid";
import { APP_TOKEN_KEY, GOOGLE_ACCESS_TOKEN_KEY, hs } from "./helpers";
import { isTokenValid, type GetTokensResponse } from "./apis";

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
        console.log("no userUid after attempting to create", userUid);
    }

    return userUid;
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
    const valid = await isTokenValid(access_token);
    if (!valid) {
      hs.log("access_token: invalid or expired");
      // todo - sendResponse({ error_code: "invalid" })
    } else{
      hs.log("access_token: valid");
    }
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