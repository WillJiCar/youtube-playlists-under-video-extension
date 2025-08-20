import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'
import { resolve } from "path"

export default defineConfig(async () => {

    const { viteStaticCopy } = await import('vite-plugin-static-copy');
    
    return {
        plugins: [react(), viteStaticCopy({
            targets: [
            {
                src: '../manifest.json', // this allows web-ext run to load from the dist folder correctly
                dest: './'
            },
            {
                src: "../config.json",
                dest: "./"
            }
        ]
        })],
        root: ".",
        build: {
            outDir: "dist-ext",
            rollupOptions: {
                input: {
                    popup: resolve(__dirname, "popup/popup.html"),
                    background: resolve(__dirname, "background/background.html"),
                    content: resolve(__dirname, "content/content.ts")
                },
                output: {
                    entryFileNames: '[name].js', // Ensures clean output names
                    assetFileNames: 'assets/[name].[ext]'
                }
            }
        }
}});
