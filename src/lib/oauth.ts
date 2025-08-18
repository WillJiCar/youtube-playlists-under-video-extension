
// console - https://console.cloud.google.com/apis/api/youtube.googleapis.com/metrics?authuser=1&inv=1&invt=Ab5vyA&project=youtube-playlists-under-video

const scopes = "https://www.googleapis.com/auth/youtube";

interface ExtensionConfig {
  clientId?: string
  environment?: "local"
  proxyPort?: number
}

export async function getConfig() {
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    return config as ExtensionConfig;
  } catch (error) {
    console.log("Failed to load config:", error);
    return null;
  }
}

export async function loginWithGoogle() {
  let token = null;
  const config = await getConfig();
  const env = config?.environment;
  const port = config?.proxyPort ?? 3000;
  const redirect_uri = `${browser.identity.getRedirectURL()}google-auth`
  console.log("redirect_uri", redirect_uri)

  console.log("Environment", env);
  if(env == "local" && false){
    // if calling from a local dev extension, call to local express server in order to use a static redirect URI
    
    const proxyUrl = `http://localhost:${port}/auth/proxy`;
    console.log("Proxying auth to", proxyUrl)
    token = await fetch(proxyUrl).then(() => handleProxyResponse(port));
    console.log("Got token from proxy", token);
  } else {
    // otherwise use launchWebAuthFlow

    const clientId = config?.clientId;

    if(!clientId){
      throw new Error("Unable to fetch clientId");
    }

    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&prompt=consent`;

    console.log("Starting Google OAuth");
    const redirectResponse = await browser.identity.launchWebAuthFlow({
      interactive: true,
      url: authUrl
    });

    const params = new URL(redirectResponse).hash.substring(1);
    const accessToken = new URLSearchParams(params).get("access_token");
    console.log("access_token", accessToken);

    if (!accessToken) throw new Error("Login failed: no token returned");

    token = accessToken;
  }

  await browser.storage.local.set({ accessToken: token });

  return token;
}

export async function isTokenValid(token: string) {
  try {
    const resp = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    if (!resp.ok) return false;
    const data = await resp.json();
    return !data.error; // true if no error
  } catch (err) {
    console.log("Token validation failed", err);
    return false;
  }
}

function handleProxyResponse(port: number) {
  return new Promise((resolve) => {
    window.addEventListener('message', (event) => {
      if (event.origin === `http://localhost:${port}` && event.data.type === 'oauth_response') {
        resolve(event.data.token);
      }
    });
  });
}