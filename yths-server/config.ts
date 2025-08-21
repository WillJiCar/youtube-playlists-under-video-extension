import dotenv from "dotenv";
import config from "../config.json";

dotenv.config({
  path: "../.env"
});

export const PORT = config.proxyPort; // json config is shared with the extension

export const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "mock_";
export const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "secret_";
export const APP_SECRET = process.env.APP_SECRET;
export const DOMAIN = process.env.DOMAIN;
if(!APP_SECRET){
  throw new Error("APP_SECRET required but is missing");
}
export const REDIRECT_URI = `https://${DOMAIN}:${PORT}/auth/callback`;