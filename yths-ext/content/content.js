/*
(async function() {
  const { selectedPlaylists, accessToken } = await browser.storage.local.get(["selectedPlaylists", "accessToken"]);
  if (!selectedPlaylists || !accessToken) return;

  // Find target container
  const target = document.getElementById("above-the-fold");
  if (!target) return;

  const videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) return;

  // Check which playlists contain this video
  const playlistChecks = await Promise.all(selectedPlaylists.map(async id => {
    const resp = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&videoId=${videoId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await resp.json();
    return { id, hasVideo: data.items && data.items.length > 0 };
  }));

  // Build UI
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.gap = "8px";

  playlistChecks.forEach(p => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = p.hasVideo;
    checkbox.addEventListener("change", async () => {
      if (checkbox.checked) {
        await addToPlaylist(p.id, videoId);
      } else {
        await removeFromPlaylist(p.id, videoId);
      }
    });
    wrapper.appendChild(checkbox);
  });

  target.prepend(wrapper);
})();

async function addToPlaylist(playlistId, videoId) {
  const { accessToken } = await browser.storage.local.get("accessToken");
  await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId
        }
      }
    })
  });
}

async function removeFromPlaylist(playlistId, videoId) {
  const { accessToken } = await browser.storage.local.get("accessToken");

  // First fetch playlist item ID
  const resp = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=id&playlistId=${playlistId}&videoId=${videoId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await resp.json();
  if (data.items.length) {
    const itemId = data.items[0].id;
    await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }
}
*/