import { isTokenValid, loginWithGoogle } from "../google.js";

export interface BrowserMessage {
  action: "getToken" | "login" | "OAUTH_RESULT"
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
          console.log("Stored token is invalid or expired, clearing...");
          token = await loginWithGoogle();
        }
      } else {
        console.log("Token not found in storage, returning null");
      }

      sendResponse(token);
    });
    return true;
  } 
});

// OBSOLETE - below doesn't work due to localStorage not being accessible from a firefox extension
window.addEventListener("storage", (ev) => {
  console.log("got event", ev);
  if(ev.key == "YTHS_ACCESS_TOKEN"){
    browser.storage.local.set({ accessToken: ev.newValue });
    window.localStorage.removeItem("YTHS_ACCESS_TOKEN");
  }
})
