import fs from "fs";
import path from "path";
import crypto from "crypto";
import { APP_SECRET } from "./config";

const DATA_DIR = path.join(__dirname, ".data");
const DATA_FILE = path.join(DATA_DIR, "credentials.enc");
const SECRET_KEY = Buffer.from(APP_SECRET, "base64");

const ALGO = "aes-256-gcm";
const IV_LENGTH = 16;

function encrypt(data: string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, SECRET_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]); // [IV|TAG|DATA]
}

function decrypt(buffer: Buffer): string {
  const iv = buffer.slice(0, IV_LENGTH);
  const tag = buffer.slice(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buffer.slice(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGO, SECRET_KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export const loadFromDisk = () => {
  if (!fs.existsSync(DATA_FILE)) {
    console.log("No existing credentials file, starting fresh.");
    return new Map();
  }

  try {
    const encrypted = fs.readFileSync(DATA_FILE);
    const json = decrypt(encrypted);
    const obj = JSON.parse(json) as [any, any][];
    console.log("Loaded credentials from disk, count:", obj.length);
    return new Map(obj);    
  } catch (err) {
    console.error("Failed to load credentials:", err);
    return new Map();
  }
}

export const saveToDisk = (map: Map<any, any>) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }
    const obj = JSON.stringify(Array.from(map.entries()));
    const encrypted = encrypt(obj);
    fs.writeFileSync(DATA_FILE, encrypted);
  } catch (err) {
    console.error("Failed to save credentials:", err);
  }
}
