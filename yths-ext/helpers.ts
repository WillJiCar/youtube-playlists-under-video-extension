
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
    const err = new Error(); // use error to grab where the code is being called from
    const file = err.stack?.split("\n")[2]?.trim().split("/") ?? [""]; 
    const stack = file[file.length -1]?.split("?")[0]; // doesn't show correct file

    console.log.apply(console, [`[HS]:${APP_VERSION}`, ...args]);
  }

  public error(error?: any): void {
    console.error(`[HS]:${APP_VERSION} - ERROR:`, error || '');
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