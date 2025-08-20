import express from "express";
import config from "../config.json";
import cors from 'cors';
import cookieParser from "cookie-parser";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";
import url from "url";
import { google } from "googleapis";
import path from "path";
import crypto from "crypto";
import { getAuthUrl, getCallbackHtml } from "./services";

dotenv.config();

const app = express();
const PORT = config.proxyPort; // json config is shared with the extension

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "mock_";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "secret_";
const REDIRECT_URI = `https://localhost:${PORT}/auth/callback`;
const AUTH_STATE = crypto.randomBytes(32).toString("hex");

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
  const oauth2Client = new google.auth.OAuth2({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uris: [REDIRECT_URI]
  });
  const url = getAuthUrl(oauth2Client, AUTH_STATE);
  res.json({ url: url });
});

app.get("/auth/callback", async (req, res) => {
  try{
    let q = url.parse(req.url, true).query;
    const state = (req as any).session.state;

    if(q.error){
      console.log("Error:", q.error);
      throw new Error(q.error as string ?? "eror");
    }
    if(q.state !== state){
      throw new Error("Invalid auth");
    }
    if(!q.code){
      throw new Error("No code");
    }

    const oauth2Client = new google.auth.OAuth2({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI]
    }); // TODO - fix this

    const { tokens } = await oauth2Client.getToken({ code: Array.isArray(q.code) ? q.code[0] as string : q.code });

    oauth2Client.setCredentials(tokens);
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