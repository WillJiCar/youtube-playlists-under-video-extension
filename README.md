# youtube-playlists-under-video-extension

Renders your YouTube playlists under the current video as toggleable checkboxes

## Debugging with Firefox (Windows)
    Project contains 3 processes, 1) web-ext browser development tool 2) vite React dev server (for background & popup scripts) 3) express server for handling Google OAuth2
    `npm run dev` - runs all 3 processes using concurrently, some requirements:
        `config.json` @ root with { proxyPort: 3000 }
        `.env` @ root with (...)
        `npm install --global web-ext` - firefox development tool
        https localhost certificates

## Why send a message from popup script to background script instead of calling an API directly?
    While possible, if the content scripts need to use the extensions API's (google auth proxy, youtube api) then messaging is required,
    therefore to centralize logic, both the popup & content scripts will call a message to the background script.

## Google OAuth
    

### mkcert-init.ps1
    mkcert & OpenSSL are used to create or validate a localhost https cert used by the express oauth proxy server
    download mkcert: https://github.com/FiloSottile/mkcert
    download choco: https://chocolatey.org/install
    download openssl https://slproweb.com/products/Win32OpenSSL.html
    
## Other notes

Inspect element / add extension:
    about:debugging#/runtime/this-firefox