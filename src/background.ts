import { isTokenValid, loginWithGoogle } from "./lib/oauth.js";

export interface BrowserMessage {
  action: "getToken" | "login"
}

if (!window.browser) {
  console.log("creating simulated browser object")
  // Running in simulation mode through popup-dev.html
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

    },
    runtime: {
        onMessage: { addListener: () => {} },
        sendMessage: async (msg: { action: "getToken" | "login" }) => {
            // mock implementation allowing to use extension in its own tab, would normally go to background.js
            await messageHandler(msg);
        }
    }
  } as any;
 
} else {
  console.log("Extension running")
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
  return await messageHandler(msg);
});


export const messageHandler = async (msg: BrowserMessage) => {
  console.log("received message: ", msg);
  if (msg.action === "login") {
      const token = await loginWithGoogle();
      return token;
  }

  if (msg.action === "getToken") {
    const storedToken = await browser.storage.local.get("accessToken");
    let token = storedToken?.accessToken;
    if(token){
      const valid = await isTokenValid(token);
      if (!valid) {
        console.log("Stored token is invalid or expired, clearing...");
        token = await loginWithGoogle();
      }
    } else {
      console.log("Token not found in storage, returning null");
    }

    return token;
  } 
}