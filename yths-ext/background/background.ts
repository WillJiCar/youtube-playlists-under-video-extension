import { addVideoToPlaylist, checkPlaylistsForVideoId, login, removeVideoFromPlaylist } from "../apis.js";
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

let currentRunId = 0;
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
    const runId = ++currentRunId;
    getDataFromStorage().then(async data => {
      if(data.accountId && data.playlists){        
        try{
          const selected = await getSelectedPlaylistsFromStorage(data.accountId);          
          const selectedPlaylists = await checkPlaylistsForVideoId(msg.videoId, data.playlists.filter(p => selected.includes(p.id)));
          if(runId == currentRunId){
            sendResponse(selectedPlaylists);
          } else { 
            hs.log("prevented from sending response to FETCH_PLAYLISTS_FOR_CONTENT as currentRunId", currentRunId, "does not match our run id", runId);
            sendResponse(null);
          }          
        }
        catch(err){
          hs.log("WARNING: Couldn't fetch playlists for content script as error thrown while getting selected playlists");
          hs.error(err);
          sendResponse(null);
        }
      } else {
        hs.log("WARNING: Couldn't fetch playlists for content script as accountId or playlists is null (not logged in?)");
        sendResponse(null);
      }
    });

    return true;
  }

  if(msg.action == "ADD_VIDEO_TO_PLAYLIST"){
    // msg.videoId, msg.playlistId
    addVideoToPlaylist(msg.playlistId, msg.videoId).then(res => {
      sendResponse(res);
    }).catch(res => sendResponse(res));
    return true;
  }

  if(msg.action == "REMOVE_VIDEO_FROM_PLAYLIST"){
    // playlistItemId
    removeVideoFromPlaylist(msg.playlistItemId).then(res => {
      sendResponse(res);
    }).catch(res => sendResponse(res));
    return true;
  }

});

let storageChangeTimeout: ReturnType<typeof setTimeout> | null = null; // used to debounce rapid change in selected playlists

browser.storage.onChanged.addListener(async (storage) => {
  if (storageChangeTimeout) {
    clearTimeout(storageChangeTimeout);
  }

  storageChangeTimeout = setTimeout(async () => {
    const data = await getDataFromStorage();
    if(storage[`SELECTED_PLAYLISTS_${data.accountId}`]){
      // current logged in account's selected playlists have changed, check if content script is on a valid page to receive updated playlists
      try{
        hs.log("sending VERIFY_PAGE_REQUIRES_UPDATE")
        const activeTabs = await browser.tabs.query({ active: true });
        for(let i = 0; i < activeTabs.length; i++){
          const tabId = activeTabs[i];
          if(tabId && tabId.id){
            await browser.tabs.sendMessage(tabId.id, { action: "VERIFY_PAGE_REQUIRES_UPDATE" }); // if received by content script while on a youtube video, FETCH_PLAYLISTS_FOR_CONTENT is triggered
          }          
        }        
      } catch(err){
        //hs.log("error calling VERIFY_PAGE_REQUIRES_UPDATE")
        // this will fail if content script is not loaded on a youtube video (and therefore event listener doesn't exist)
      }    
    } 
  }, 1000);
})