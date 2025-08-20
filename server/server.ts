import express from "express";
import config from "../config.json";
import cors from 'cors';
import cookieParser from "cookie-parser";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";
import url from "url";
import { google } from "googleapis";
import { getCallbackHtml } from "./callback";
import path from "path";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = config.proxyPort; // json config is shared with the extension

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "mock_";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "secret_";
const REDIRECT_URI = `https://localhost:${PORT}/auth/callback`;
const AUTH_STATE = crypto.randomBytes(32).toString("hex");

const oauth2Client = new google.auth.OAuth2({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uris: [REDIRECT_URI]
});

google.options({auth: oauth2Client});

const keyPath = "./certs/localhost-key.pem";
const certPath = "./certs/localhost.pem";

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
  server = app;
}

app.use("/assets", express.static(path.join(__dirname, "wwwroot")));

app.use(cors({
  origin: [
    /moz-extension:\/\/*/, // Allows all Firefox extension origins
    'http://localhost',    // For testing in browser
    'chrome-extension://*' // For Chrome extensions
  ],
  credentials: true
}));

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ status: "yo" });
})

// called after clicking login button
app.get("/auth/login", (req, res) => {

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube"],
    response_type: "code",
    state: AUTH_STATE
  });
  // TODO - add crypto state to verify callback - https://developers.google.com/identity/protocols/oauth2/web-server#node.js_1    
  console.log("sending redirect URL:", url);
  res.json({ url: url });
});

app.get("/auth/callback", async (req, res) => {
  try{
    let q = url.parse(req.url, true).query;

    if(q.error){
      console.log("Error:", q.error);
      throw new Error(q.error as string ?? "eror");
    }
    if(q.state !== (req as any).session.state){
      throw new Error("Invalid auth");
    }
    if(!q.code){
      throw new Error("No code");
    }
    const { tokens } = await oauth2Client.getToken({ code: Array.isArray(q.code) ? q.code[0] as string : q.code });

    oauth2Client.credentials = tokens;
    const token = tokens.access_token;
    if(token){
      console.log("token acquited, sending to client", token);
      res.send(getCallbackHtml(token));
    } else {
      res.send(req.query);
    }
  } catch(err){
    res.send("Error, that's all folks!")
  }
});

app.get("/auth/token", (req, res) => {
  const token = req.cookies.yt_token;
  if (!token) return res.status(401).send("Not authenticated");
  res.json({ access_token: token });
});

server.listen(PORT, () => console.log(`[oauth proxy] running on ${usingHttps ? "https": "http"}://localhost:${PORT}`));