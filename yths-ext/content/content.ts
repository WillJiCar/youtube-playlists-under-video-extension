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
        log("checking", attempts);
        container = document.querySelector("#above-the-fold")
        attempts++;
        if(!container && attempts >= 30){
            run = false;
            log("could not find #above-the-fold after 30 seconds")
        }        
        if(container){
            run = false;
            log("found container")
        }
        await wait(1000);
    }    

    return container;
}

const log = (...args: any[]): void => {
    console.log.apply(console, [`[HS]`, ...args]);
}

const setupVideoPlaylists = (videoId: string) => {
    // cleanup old UI if re-rendered

    async function renderPlaylists(response?: PlaylistItem[] | null) {
        const oldContainer = document.querySelector("#my-extension-playlists");
        if (oldContainer) {
            oldContainer.remove();
        }

        if(!response){
            log("empty response from FETCH_PLAYLISTS_FOR_CONTENT");
            return;
        }
        log("rendering playlists", response);

        const container = await getContainer();
        if (!container) {
            log("cannot find YouTube container with #above-the-fold");
            return;
        }

        const flexDiv = document.createElement("div");
        flexDiv.id = "my-extension-playlists"; // marker for cleanup
        flexDiv.style.display = "flex";
        flexDiv.style.flexWrap = "wrap";
        flexDiv.style.gap = "1rem";
        flexDiv.style.padding = "1rem 0";

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
            checkbox.dataset.playlistItemId = item.playlistItemId ?? undefined;
            checkbox.checked = !!item.playlistItemId;

            // toggle handler
            checkbox.addEventListener("change", () => {
                const prevState = !checkbox.checked;
                checkbox.disabled = true;

                const playlistId = checkbox.dataset.playlistId!;
                const videoId = checkbox.dataset.videoId!;
                const playlistItemId = checkbox.dataset.playlistItemId!;

                if (checkbox.checked) {
                    browser.runtime.sendMessage({
                        action: "ADD_VIDEO_TO_PLAYLIST",
                        playlistId,
                        videoId
                    })
                    .then(res => {
                        if (res) {
                            checkbox.dataset.playlistItemId = res;
                            log("video", videoId, "added to playlist");
                        } else {
                            log("missing playlistItemId in response");
                            checkbox.checked = prevState;
                        }
                    })
                    .catch(err => {
                        log("ADD_VIDEO_TO_PLAYLIST error", err);
                        checkbox.checked = prevState;
                    })
                    .finally(() => { checkbox.disabled = false; });
                } else {
                    browser.runtime.sendMessage({
                        action: "REMOVE_VIDEO_FROM_PLAYLIST",
                        playlistItemId
                    })
                    .then(res => {
                        if (res) {
                            log("video", videoId, "removed from playlist");
                        } else {
                            log("remove failed");
                            checkbox.checked = prevState;
                        }
                    })
                    .catch(err => {
                        log("REMOVE_VIDEO_FROM_PLAYLIST error", err);
                        checkbox.checked = prevState;
                    })
                    .finally(() => { checkbox.disabled = false; });
                }
            });

            const labelText = document.createElement("span");
            labelText.textContent = item.snippet.title ?? "NA";

            wrapper.appendChild(checkbox);
            wrapper.appendChild(labelText);
            flexDiv.appendChild(wrapper);
        });

        container.appendChild(flexDiv);
    }

    // --- Fetch playlists initially ---
    browser.runtime.sendMessage({
        action: "FETCH_PLAYLISTS_FOR_CONTENT",
        videoId
    }).then(renderPlaylists).catch(err => log("Message failed", err));

    // --- Listen for updates ---
    const onMessage = (message: any) => {
        log("got message on content side", message);
        if (message?.action === "VERIFY_PAGE_REQUIRES_UPDATE"){ // this is called whenever selected playlists updated, if this is received then background knows to continue fetching playlistItemId's based on current video
            log("received VERIFY_PAGE_REQUIRES_UPDATE")
            browser.runtime.sendMessage({ action: "FETCH_PLAYLISTS_FOR_CONTENT", videoId }).then(renderPlaylists).catch(err => log("Message failed", err));;
        }
    };

    // ensure no duplicates
    //browser.runtime.onMessage.removeListener(onMessage);
    log("adding event listener")
    browser.runtime.onMessage.addListener(onMessage);
}


log("content script loaded");
const accessToken = localStorage.getItem('YTHS_ACCESS_TOKEN');
const appToken = localStorage.getItem('YTHS_APP_TOKEN');
if(browser){
    if(accessToken){
        log("sending token to extension OAUTH_RESULT")
        browser.runtime.sendMessage({
            action: "OAUTH_RESULT",
            access_token: accessToken,
            app_token: appToken
        }).then(response => {
            log("background responded:", response);
            localStorage.removeItem("YTHS_ACCESS_TOKEN");
            localStorage.removeItem("YTHS_APP_TOKEN");
        }).catch(err => log("Message failed:", err));
    }

    if(window.location.href.includes("youtube.com/watch?v=")){
        const url = new URL(window.location.href);
        const videoId = url.searchParams.get("v");

        if (videoId) {
            setupVideoPlaylists(videoId);
        }
    }
} else {
    log("browser not available")
}