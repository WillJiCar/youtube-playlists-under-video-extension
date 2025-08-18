
const scopes = "https://www.googleapis.com/auth/youtube";

export async function loginWithGoogle(clientId) {

    const redirect_uri = `${browser.identity.getRedirectURL()}google-auth`
    console.log("redirect_uri", redirect_uri)

    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&prompt=consent`;

    let token = null;

    if(!token){
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
