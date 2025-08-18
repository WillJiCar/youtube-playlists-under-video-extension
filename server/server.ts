import express from "express";
import config from "../config.json";
import cors from 'cors';

const app = express();
const PORT = config.proxyPort;

app.use(cors({
  origin: [
    /moz-extension:\/\/*/, // Allows all Firefox extension origins
    'http://localhost',    // For testing in browser
    'chrome-extension://*' // For Chrome extensions
  ],
  credentials: true
}));

// OAuth proxy endpoint
app.get('/auth/proxy', async (req, res) => {
    const clientId = config.clientId;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=http://localhost:${PORT}/auth/callback&` +
        `response_type=token&` +
        `scope=email profile`;

    res.redirect(authUrl); 
}); 

// OAuth callback handler
app.get('/auth/callback', (req, res) => {
  const token = req.query.access_token || (req as any)?.hash?.split('=')[1];
  res.send(`
    <script>
      window.opener.postMessage({ 
        type: 'oauth_response', 
        token: '${token}' 
      }, 'http://localhost:${PORT}');
      window.close();
    </script>
  `);
});

app.listen(PORT, () => console.log(`OAuth proxy running on http://localhost:${PORT}`));