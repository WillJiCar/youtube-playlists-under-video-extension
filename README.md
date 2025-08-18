# youtube-playlists-under-video-extension

Renders your YouTube playlists under the current video as toggle-able checkboxes

Requires src/config.json with "clientId": "your-client-id"
To debug with Firefox:
    npm install --global web-ext
    npm start
        node build.js && web-ext run --browser-console

Inspect element / add extension:
    about:debugging#/runtime/this-firefox

Console: https://console.cloud.google.com/apis/api/youtube.googleapis.com/metrics?authuser=1&inv=1&invt=Ab5vyA&project=youtube-playlists-under-video