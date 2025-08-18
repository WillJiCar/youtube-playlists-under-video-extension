declare module "./background.js" {
  export function messageHandler(msg: any): Promise<string | null>;
}
