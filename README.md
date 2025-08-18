# youtube-playlists-under-video-extension

Renders your YouTube playlists under the current video as toggle-able checkboxes

Requires config.json in repo root with "clientId": "your-client-id"
To debug with Firefox:
    npm install --global web-ext
    npm start
        node build.js && web-ext run --browser-console

Inspect element / add extension:
    about:debugging#/runtime/this-firefox