import type { PlaylistItem } from "../types";

const wait = async (ms: number) => {
  return await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  })
}

const getContainer = async () => {
    let container = document.querySelector("#above-the-fold")
    let attempts = 0;
    let run = !container;
    while(run){
        console.log("[hs] checking", attempts);
        container = document.querySelector("#above-the-fold")
        attempts++;
        if(!container && attempts >= 30){
            run = false;
            console.log("[hs] could not find #above-the-fold after 30 seconds")
        }        
        if(container){
            run = false;
            console.log("[hs] found container")
        }
        await wait(1000);
    }    

    return container;
}

console.log("[hs] content script loaded");
const accessToken = localStorage.getItem('YTHS_ACCESS_TOKEN');
const appToken = localStorage.getItem('YTHS_APP_TOKEN');
if(browser){
    if(accessToken){
        console.log("[hs] sending token to extension OAUTH_RESULT")
        browser.runtime.sendMessage({
            type: "OAUTH_RESULT",
            access_token: accessToken,
            app_token: appToken
        }).then(response => {
            console.log("[hs] background responded:", response);
            localStorage.removeItem("YTHS_ACCESS_TOKEN");
            localStorage.removeItem("YTHS_APP_TOKEN");
        }).catch(err => console.error("Message failed:", err));
    }

    if(window.location.href.includes("youtube.com/watch?v=")){
        const url = new URL(window.location.href);
        const videoId = url.searchParams.get("v");

        browser.runtime.sendMessage({
            action: "FETCH_PLAYLISTS_FOR_CONTENT",
            videoId: videoId
        }).then(async (response?: PlaylistItem[]) => {
            console.log("[hs] FETCH_PLAYLISTS_FOR_CONTENT response", response);
            const container = await getContainer();
            if(!container){               
                console.log("[hs] cannot find YouTube container with #above-the-fold")
                return;
            }

            const flexDiv = document.createElement("div");
            flexDiv.style.display = "flex";
            flexDiv.style.flexWrap = "wrap";
            flexDiv.style.gap = "1rem";
            flexDiv.style.padding = "1rem 0"

            response?.forEach(item => {
                const playlistId = item.id;

                const wrapper = document.createElement("label");
                wrapper.style.display = "flex";
                wrapper.style.alignItems = "center";
                wrapper.style.gap = "0.3rem";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.dataset.playlistId = playlistId;
                checkbox.dataset.videoId = videoId ?? "NA";
                checkbox.checked = item.containsCurrentVideo == true;

                // toggle handler
                checkbox.addEventListener("change", (ev) => {
                    checkbox.disabled = true; // prevent further toggling
                    const playlistId = checkbox.dataset.playlistId;
                    const videoId = checkbox.dataset.videoId;                    

                    if(checkbox.checked){
                        browser.runtime.sendMessage({
                            type: "ADD_VIDEO_TO_PLAYLIST",
                            playlistId,
                            videoId
                        }).finally(() => {
                            checkbox.disabled = false; // unlock checkbox after response
                        });
                    } else {
                        browser.runtime.sendMessage({
                            type: "REMOVE_VIDEO_TO_PLAYLIST",
                            playlistId,
                            videoId
                        }).finally(() => {
                            checkbox.disabled = false; // unlock checkbox after response
                        });
                    }                    
                });

                // Add label text
                const labelText = document.createElement("span");
                labelText.textContent = item.snippet.title ?? "NA";

                wrapper.appendChild(checkbox);
                wrapper.appendChild(labelText);

                flexDiv.appendChild(wrapper);
            });

            // Append flex container as last child
            container.appendChild(flexDiv);
        }).catch(err => console.log("[hs] Message failed", err));
    }
} else {
    console.log("[hs] browser not available")
}