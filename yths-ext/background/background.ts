import { checkPlaylistsForVideoId, login } from "../apis.js";
import { getDataFromStorage, getSelectedPlaylistsFromStorage, getTokensFromStorage } from "../browser.js";
import { hs } from "../helpers.js";

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
      login(sendResponse);
      return true; // this is required when using promises, "sendResponse" is used to callback a response
  }

  if (msg.action === "getToken") {    
    getTokensFromStorage(sendResponse)
    return true;
  } 

  if(msg.action == "FETCH_PLAYLISTS_FOR_CONTENT") {
    getDataFromStorage().then(async data => {
      if(data.accountId && data.playlists){        
        try{
          const selected = await getSelectedPlaylistsFromStorage(data.accountId);          
          const selectedPlaylists = await checkPlaylistsForVideoId(msg.videoId, data.playlists.filter(p => selected.includes(p.id)));
          sendResponse(selectedPlaylists);
        }
        catch(err){
          hs.log("WARNING: Couldn't fetch playlists for content script as error thrown while getting selected playlists");
          hs.error(err);
          sendResponse([]);
        }
      } else {
        hs.log("WARNING: Couldn't fetch playlists for content script as accountId or playlists is null (not logged in?)");
        sendResponse([]);
      }
    });

    return true;
  }

  if(msg.action == "ADD_VIDEO_TO_PLAYLIST"){
    // msg.videoId, msg.playlistId
    return true;
  }

  if(msg.action == "REMOVE_VIDEO_TO_PLAYLIST"){
    // msg.videoId, msg.playlistId
    return true;
  }

});
