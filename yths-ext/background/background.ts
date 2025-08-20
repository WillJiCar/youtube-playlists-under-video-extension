import { isTokenValid, loginWithGoogle } from "../google.js";

export interface BrowserMessage {
  action: "getToken" | "login" | "OAUTH_RESULT"
}

if (!window.browser) { // if running through vite dev server
  console.log("creating simulated browser object")
  window.browser = {
    storage: {
        local: {
            get: (key: string) => {
              const value = localStorage.getItem(key);
              return value ? JSON.parse(value) : null;
            },
            set: (key: string, value: unknown) => {
                localStorage.setItem(key, JSON.stringify(value));
            }
        }        
    },
    identity: {

    }
  } as any;
 
} else {
  console.log("Extension running")
}

// addListener cannot have an async function, other event handlers will not receieve the message
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("received message: ", msg);
  if (msg.action === "login") {
      loginWithGoogle().then((token) => {
        sendResponse(token);
      }).catch((err) => console.log(err));
      return true; // this is required when using promises, "sendResponse" is used to callback a response
  }

  if (msg.action === "getToken") {

    browser.storage.local.get("accessToken").then(async (storedToken) => {
      let token = storedToken?.accessToken;
      if(token){
        const valid = await isTokenValid(token);
        if (!valid) {
          console.log("Stored token is invalid or expired");
          
        }
      } else {
        console.log("Token not found in storage, returning null");
      }

      sendResponse(token);
    });
    return true;
  } 
});
