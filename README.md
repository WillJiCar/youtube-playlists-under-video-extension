# youtube-playlists-under-video-extension

Renders your YouTube playlists under the current video as toggleable checkboxes

## Debugging with Firefox (Windows)
    Project contains 3 processes, 1) web-ext browser development tool 2) vite React dev server (for background & popup scripts) 3) express server for handling Google OAuth2
    `npm run dev` - runs all 3 processes using concurrently, some requirements:
        `config.json` @ root with { proxyPort: 3000 }
        `.env` @ root with (...)
        `npm install --global web-ext` - firefox development tool
        https localhost certificates

## Google OAuth
    It's suggested in order to be more compliant use the native extension's browser.identity.launchWebAuthFlow instead of proxying to an express server. This means for local development environments it is required to manually enter the extensions UUID in google console's authorized redirect URI's each time it is refreshed by web-ext. The express proxy server aims to eliminate this by using localhost:3000 as the redirect URI, then passing the token to the extension.  

### mkcert-init.ps1
    mkcert & OpenSSL are used to create or validate a localhost https cert used by the express oauth proxy server
    download mkcert: https://github.com/FiloSottile/mkcert
    download choco: https://chocolatey.org/install
    download openssl https://slproweb.com/products/Win32OpenSSL.html
    
## Other notes

Inspect element / add extension:
    about:debugging#/runtime/this-firefox