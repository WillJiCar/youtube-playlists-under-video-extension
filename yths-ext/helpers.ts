
export const APP_VERSION = "o.2";
export const GOOGLE_ACCESS_TOKEN_KEY = "google_access_token";
export const APP_TOKEN_KEY = "yths_access_token";

// custom console.log wrapper
export class HS {
  private static instance: HS;

  private constructor() {
  }

  public static getInstance(): HS {
    if (!HS.instance) {
      HS.instance = new HS();
    }
    return HS.instance;
  }

  public log(...args: any[]): void {
    const timestamp = new Date().toISOString();
    console.log(`[HS]:${APP_VERSION}`,...args);
  }

  public error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error || '');
  }
}
export const hs = HS.getInstance();

export const convertImageToBase64 = async (url: string) => {
    try{
        const res = await fetch(url);
        const blob = await res.blob();

        return new Promise<string | null>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string | null);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch(err){
        console.log("Error converting to base64", err);
    }
}