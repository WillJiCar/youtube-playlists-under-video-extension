import express from "express";
import config from "../config.json";
import cors from 'cors';
import cookieParser from "cookie-parser";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";
import url from "url";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { Response } from "express";
import { base64url, createOAuth2Client, encodeJwt, getAuthUrl, getCallbackHtml, getOAuth2Client, decodeJwt, randomBytesUrl, getAppToken, isOld } from "./services";
import { Credentials } from "google-auth-library";

dotenv.config({
  path: "../.env"
});

const app = express();
const PORT = config.proxyPort; // json config is shared with the extension

export const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "mock_";
export const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "secret_";
export const STATE_SIGNING_SECRET = process.env.STATE_SIGNING_SECRET;
export const DOMAIN = process.env.DOMAIN;
if(!STATE_SIGNING_SECRET){
  throw new Error("STATE_SIGNING_SECRET required but is missing");
}
export const REDIRECT_URI = `https://${DOMAIN}:${PORT}/auth/callback`;
const AUTH_STATE = crypto.randomBytes(32).toString("hex");

const keyPath = "../certs/localhost-key.pem";
const certPath = "../certs/localhost.pem";

let usingHttps = false;
let server;
if(fs.existsSync(certPath) && fs.existsSync(keyPath)){
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  } 
  
  server = https.createServer(httpsOptions, app);
  usingHttps = true;
} else {
  console.log("WARNING: https IS NOT ACTIVE, EXTENSION/APP WILL NOT WORK");
  server = app;
}

const userClients = new Map<string, Credentials>();
const pendingAuth = new Map();

app.use("/assets", express.static(path.join(__dirname, "wwwroot")));

app.use(cors({
  origin: [
    /moz-extension:\/\/*/, // Allows all Firefox extension origins
    /^http:\/\/localhost:\d+$/,    // For testing in browser
    /chrome-extension:\/\/.*/ // For Chrome extensions
  ]
}));

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ status: "yo" });
})

// called after clicking login button
app.get("/auth/login", async (req, res) => {

  const { userUid } = req.query
  if(!userUid){
    return badRequest(res, "Missing userUid");
  }

  console.log("incoming login from", userUid);

  const appToken = await getAppToken(userUid as string);

  const code_verifier = randomBytesUrl(64);
  const code_challenge = base64url(crypto.createHash("sha256").update(code_verifier).digest());

  const nonce = uuidv4();
  const state = await encodeJwt(nonce);

  const oauth2Client = createOAuth2Client();
  const url = getAuthUrl(oauth2Client, state, code_challenge);

  pendingAuth.set(nonce, { code_verifier, createdAt: Date.now(), app_token: appToken, userUid });
  // remove old entries
  for (const [k, v] of pendingAuth.entries()) {
    if (isOld(v.createdAt)) pendingAuth.delete(k);
  }

  res.json({ url: url });
});

app.get("/auth/callback", async (req, res) => {
  try{
    let q = url.parse(req.url, true).query;
    const state = q.state;
    const code = Array.isArray(q.code) ? q.code[0] as string : q.code;

    if(q.error){
      return badRequest(res, "Error: " + q.error);
    }
    if(!state){
      return badRequest(res, `Invalid session, token missing`);
    }
    if(!code){
      return badRequest(res, "No code");
    }

    const nonce = await decodeJwt(state as string);
    const tx = pendingAuth.get(nonce);
    if(!tx){
      return badRequest(res, "Invalid session");
    }

    const { app_token, userUid, code_verifier, createdAt } = tx;

    if(isOld(createdAt)){
      return badRequest(res, "Expired session");
    }

    console.log("fetching token for user", tx);

    const oauth2Client = createOAuth2Client();       
    const { tokens } = await oauth2Client.getToken({ code: code, codeVerifier: code_verifier });
    oauth2Client.setCredentials(tokens);
    const token = tokens.access_token;
    
    if(token){

      if(userUid){
        userClients.set(userUid, tokens);
      } else {
        console.log("userUid not found");
      }

      res.send(getCallbackHtml(token, app_token));
    } else {
      res.send(req.query);
    }
  } catch(err){
    console.log(err);
    console.log(req.query);
    res.status(500).send("Error, that's all folks!")
  }
});

app.get("/auth/token", async (req, res) => {
  try{
    const appToken = req.headers.authorization?.split(" ")[1];
    if (!appToken) return res.status(401).send("Missing auth");

    const uuid = await decodeJwt(appToken);

    if(!uuid){
      return badRequest(res, "Failed decoding JWT, missing uuid");
    }

    const storedToken = userClients.get(uuid);
    if(!storedToken?.refresh_token){
      return badRequest(res, "No refresh token available");
    }

    const client = getOAuth2Client(storedToken);
    await client.refreshAccessToken();

    const { access_token, expiry_date, refresh_token } = client.credentials;
    console.log("refresh_token", refresh_token);

    const newAppToken = await getAppToken(uuid);

    res.json({
      access_token, expiry_date, app_token: newAppToken
    });
     
  } catch(err){
    console.error(err);
    res.status(500).send("Refresh failed");
  }
});

server.listen(PORT, () => console.log(`[oauth proxy] running on ${usingHttps ? "https": "http"}://localhost:${PORT}`));

const badRequest = (res: Response, error: string) => {
  console.log(error);
  res.status(400).send(error)
}